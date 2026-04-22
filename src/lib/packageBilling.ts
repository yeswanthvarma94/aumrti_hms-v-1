import { supabase } from "@/integrations/supabase/client";

/**
 * Package Excess Charge Detection
 * --------------------------------
 * Detects services consumed by an IPD patient that fall OUTSIDE
 * the scope of their booked health package (extra services, extra
 * length-of-stay, room upgrade).
 *
 * Schema-tolerant notes (the live schema does not yet have first-class
 * `package_id`, `package_los_days`, or `package_room_type` columns on
 * `admissions`, nor `package_inclusions` / `package_room_type` columns
 * on `health_packages`):
 *
 *   - `packageId` is accepted as a parameter (caller resolves it from
 *     the admission, e.g. via a `package_bookings` row matched by
 *     patient_id, or from a future column on admissions).
 *   - Inclusions are read from `health_packages.components` (Json
 *     array of test/service names) — the existing canonical field.
 *   - LOS is read from `health_packages.validity_days` (used as the
 *     in-patient cover window when the package is bundled with an
 *     IPD stay) and falls back to a sensible default.
 *   - Room type rules are read from `(health_packages as any).package_room_type`
 *     when present and silently skipped otherwise.
 *
 * This keeps the utility working today and ready for the full schema.
 */

export type PackageExcessReason =
  | "not_in_inclusions"
  | "extra_los"
  | "room_upgrade";

export interface PackageExcessItem {
  reason: PackageExcessReason;
  description: string;
  quantity: number;
  unitRate: number;
  amount: number;
  /** Source bill_line_item id when the excess derives from an existing bill row. */
  sourceLineItemId?: string;
  /** Source bill id (helps with deep links). */
  sourceBillId?: string;
}

export interface PackageExcessResult {
  ok: boolean;
  packageName: string | null;
  packagePrice: number;
  inclusionsCount: number;
  packageLosDays: number | null;
  packageRoomType: string | null;
  excessItems: PackageExcessItem[];
  excessAmount: number;
  /** True when an existing `package_excess` bill is already present. */
  excessBillExists: boolean;
  /** Set if the existing excess bill is still unpaid. */
  excessBillUnpaidId?: string;
  /** Set if the excess has been formally waived (audit_log entry). */
  waived: boolean;
  error?: string;
}

const DEFAULT_PACKAGE_LOS_DAYS = 3;

const normalize = (s: unknown): string =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toComponentNames = (components: unknown): string[] => {
  if (!Array.isArray(components)) return [];
  return components
    .map((c: any) => {
      if (typeof c === "string") return c;
      return c?.name || c?.test_name || c?.service_name || c?.label || "";
    })
    .filter(Boolean)
    .map(normalize);
};

const isRoomLine = (li: any): boolean => {
  const t = normalize(li.item_type);
  const d = normalize(li.description);
  const m = normalize(li.source_module);
  return (
    t.includes("room") ||
    t.includes("ward") ||
    d.includes("room charge") ||
    d.includes("ward charge") ||
    d.includes("bed charge") ||
    m === "room" ||
    m === "ward"
  );
};

export async function checkPackageExcess(
  admissionId: string,
  packageId: string,
  hospitalId: string,
): Promise<PackageExcessResult> {
  const empty: PackageExcessResult = {
    ok: false,
    packageName: null,
    packagePrice: 0,
    inclusionsCount: 0,
    packageLosDays: null,
    packageRoomType: null,
    excessItems: [],
    excessAmount: 0,
    excessBillExists: false,
    waived: false,
  };

  if (!admissionId || !packageId || !hospitalId) {
    return { ...empty, error: "Missing admissionId, packageId or hospitalId" };
  }

  // 1. Package definition
  const { data: pkg, error: pkgErr } = await supabase
    .from("health_packages")
    .select("*")
    .eq("id", packageId)
    .eq("hospital_id", hospitalId)
    .maybeSingle();
  if (pkgErr) {
    console.error("checkPackageExcess: package fetch failed", pkgErr.message);
    return { ...empty, error: pkgErr.message };
  }
  if (!pkg) {
    return { ...empty, error: "Package not found" };
  }

  const inclusions = toComponentNames((pkg as any).components);
  const packageRoomType =
    (pkg as any).package_room_type ?? (pkg as any).room_type ?? null;
  const packageLosDays =
    (pkg as any).package_los_days ??
    (pkg as any).los_days ??
    (typeof (pkg as any).validity_days === "number"
      ? (pkg as any).validity_days
      : null) ??
    DEFAULT_PACKAGE_LOS_DAYS;

  // 2. Admission (for LOS + actual ward/room)
  const { data: admission, error: admErr } = await supabase
    .from("admissions")
    .select("admitted_at, ward_id, bed_id")
    .eq("id", admissionId)
    .maybeSingle();
  if (admErr) {
    console.error("checkPackageExcess: admission fetch failed", admErr.message);
    return { ...empty, error: admErr.message };
  }
  if (!admission) return { ...empty, error: "Admission not found" };

  const admittedAt = admission.admitted_at
    ? new Date(admission.admitted_at)
    : null;
  const actualLosDays = admittedAt
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - admittedAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // 3. All non-cancelled bills for this admission (incl. existing excess bill)
  const { data: billsRaw, error: billsErr } = await (supabase as any)
    .from("bills")
    .select("id, bill_type, bill_status, payment_status, total_amount")
    .eq("admission_id", admissionId)
    .eq("hospital_id", hospitalId);
  if (billsErr) {
    console.error("checkPackageExcess: bills fetch failed", billsErr.message);
    return { ...empty, error: billsErr.message };
  }
  const bills: any[] = Array.isArray(billsRaw) ? billsRaw : [];

  const existingExcessBill = bills.find(
    (b: any) =>
      b.bill_type === "package_excess" && b.bill_status !== "cancelled",
  );
  const excessBillExists = !!existingExcessBill;
  const excessBillUnpaidId =
    excessBillExists && existingExcessBill.payment_status !== "paid"
      ? (existingExcessBill.id as string)
      : undefined;

  const billIds = bills
    .filter(
      (b: any) =>
        b.bill_status !== "cancelled" && b.bill_type !== "package_excess",
    )
    .map((b: any) => b.id);

  // 4. Line items across all admission bills
  let lineItems: any[] = [];
  if (billIds.length > 0) {
    const { data: items, error: itemsErr } = await supabase
      .from("bill_line_items")
      .select(
        "id, bill_id, description, item_type, quantity, unit_rate, total_amount, source_module",
      )
      .in("bill_id", billIds);
    if (itemsErr) {
      console.error(
        "checkPackageExcess: bill_line_items fetch failed",
        itemsErr.message,
      );
      return { ...empty, error: itemsErr.message };
    }
    lineItems = items || [];
  }

  // 5. Detect excess items (non-room, not in inclusions)
  const excessItems: PackageExcessItem[] = [];
  for (const li of lineItems) {
    if (isRoomLine(li)) continue;
    const desc = normalize(li.description);
    const inIncl = inclusions.some(
      (inc) => desc.includes(inc) || inc.includes(desc),
    );
    if (!inIncl) {
      excessItems.push({
        reason: "not_in_inclusions",
        description: li.description,
        quantity: Number(li.quantity || 1),
        unitRate: Number(li.unit_rate || 0),
        amount: Number(li.total_amount || 0),
        sourceLineItemId: li.id,
        sourceBillId: li.bill_id,
      });
    }
  }

  // 6. Extra LOS days
  if (packageLosDays && actualLosDays > packageLosDays) {
    const extraDays = actualLosDays - packageLosDays;
    // Try to derive a per-day rate from the room line items present on the bill.
    const roomLines = lineItems.filter(isRoomLine);
    let perDay = 0;
    if (roomLines.length) {
      const totalRoom = roomLines.reduce(
        (s, l) => s + Number(l.total_amount || 0),
        0,
      );
      const totalQty = roomLines.reduce(
        (s, l) => s + Number(l.quantity || 1),
        0,
      );
      if (totalQty > 0) perDay = totalRoom / totalQty;
    }
    if (perDay <= 0 && admission.ward_id) {
      const { data: ward } = await supabase
        .from("wards")
        .select("rate_per_day")
        .eq("id", admission.ward_id)
        .maybeSingle();
      perDay = Number((ward as any)?.rate_per_day || 0);
    }
    excessItems.push({
      reason: "extra_los",
      description: `Extra LOS: ${extraDays} day(s) beyond package (${packageLosDays} day cover)`,
      quantity: extraDays,
      unitRate: perDay,
      amount: perDay * extraDays,
    });
  }

  // 7. Room upgrade differential (only if both sides known)
  if (packageRoomType && admission.ward_id) {
    const { data: ward } = await supabase
      .from("wards")
      .select("ward_type, rate_per_day")
      .eq("id", admission.ward_id)
      .maybeSingle();
    const actualRoomType = (ward as any)?.ward_type;
    if (
      actualRoomType &&
      normalize(actualRoomType) !== normalize(packageRoomType)
    ) {
      // Look up the package room type rate for differential
      const { data: pkgWard } = await supabase
        .from("wards")
        .select("rate_per_day")
        .eq("hospital_id", hospitalId)
        .ilike("ward_type", String(packageRoomType))
        .limit(1)
        .maybeSingle();
      const actualRate = Number((ward as any)?.rate_per_day || 0);
      const pkgRate = Number((pkgWard as any)?.rate_per_day || 0);
      const diff = Math.max(0, actualRate - pkgRate);
      if (diff > 0) {
        const days = Math.min(actualLosDays, packageLosDays || actualLosDays);
        excessItems.push({
          reason: "room_upgrade",
          description: `Room upgrade differential (${packageRoomType} → ${actualRoomType})`,
          quantity: days,
          unitRate: diff,
          amount: diff * days,
        });
      }
    }
  }

  // 8. Waiver lookup (audit_log)
  let waived = false;
  try {
    const { data: waivers } = await (supabase as any)
      .from("audit_log")
      .select("id")
      .eq("action", "package_excess_waived")
      .eq("entity_id", admissionId)
      .limit(1);
    waived = !!(waivers && waivers.length > 0);
  } catch (err) {
    // audit_log may be unavailable in some envs — non-fatal
    console.warn("checkPackageExcess: waiver lookup skipped", err);
  }

  const excessAmount = excessItems.reduce((s, i) => s + (i.amount || 0), 0);

  return {
    ok: true,
    packageName: (pkg as any).package_name || null,
    packagePrice: Number((pkg as any).price || 0),
    inclusionsCount: inclusions.length,
    packageLosDays,
    packageRoomType,
    excessItems,
    excessAmount,
    excessBillExists,
    excessBillUnpaidId,
    waived,
  };
}

/**
 * Resolve the package_id for an admission. Tolerates schema variants:
 *   1. admissions.package_id (when the column exists in future)
 *   2. package_bookings row matching patient_id around the admission date
 */
export async function resolvePackageIdForAdmission(
  admissionId: string,
  hospitalId: string,
): Promise<string | null> {
  const { data: adm } = await supabase
    .from("admissions")
    .select("*")
    .eq("id", admissionId)
    .maybeSingle();
  if (!adm) return null;
  const direct = (adm as any).package_id as string | undefined;
  if (direct) return direct;

  // Fallback: most recent package booking for this patient before/around admission
  const { data: bk } = await (supabase as any)
    .from("package_bookings")
    .select("id, package_id, scheduled_date, created_at")
    .eq("hospital_id", hospitalId)
    .eq("patient_id", (adm as any).patient_id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (bk && bk.length > 0) return bk[0].package_id || null;
  return null;
}
