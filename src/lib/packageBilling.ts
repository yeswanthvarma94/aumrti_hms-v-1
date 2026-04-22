import { supabase } from "@/integrations/supabase/client";

/**
 * Package Excess Charge Detection
 * --------------------------------
 * Detects services consumed during an admission that fall OUTSIDE the agreed
 * health-package coverage (item not included, LOS exceeded, room upgrade).
 *
 * Schema-tolerant: the project's current `health_packages` table only has
 * `components` (Json) — there is no `package_inclusions`, `package_los_days`
 * or `package_room_type` column in types.ts. We read those optional fields
 * via a permissive cast so a future migration that adds them works without a
 * code change. Where they are missing we fall back to safe defaults derived
 * from `components` and `estimated_hours`.
 *
 * Linkage: `admissions.package_id` does not exist either. We resolve the
 * package by looking up the most recent active `package_bookings` row for the
 * admission's patient. Callers may also pass a known `packageId` directly.
 */

export interface PackageExcessItem {
  /** Reason this charge is flagged as excess. */
  kind: "uncovered_service" | "extra_los_day" | "room_upgrade";
  description: string;
  /** Excess amount attributable to this row (₹). */
  amount: number;
  /** Optional pointer back to the offending bill_line_items row. */
  lineItemId?: string;
  /** Optional count for context (e.g. number of extra days). */
  count?: number;
}

export interface PackageExcessResult {
  /** True when the admission is actually linked to a package. */
  linked: boolean;
  packageId: string | null;
  packageName: string | null;
  excessItems: PackageExcessItem[];
  excessAmount: number;
  /** Existing package_excess bill for this admission, if any. */
  existingExcessBill: {
    id: string;
    bill_number: string | null;
    payment_status: string | null;
    total_amount: number | null;
    waived: boolean;
  } | null;
}

const EMPTY_RESULT: PackageExcessResult = {
  linked: false,
  packageId: null,
  packageName: null,
  excessItems: [],
  excessAmount: 0,
  existingExcessBill: null,
};

/** Normalise a `health_packages.components` value into a list of strings. */
function extractInclusionNames(components: any): string[] {
  if (!components) return [];
  if (Array.isArray(components)) {
    return components
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") {
          return (
            (c as any).name ||
            (c as any).service_name ||
            (c as any).description ||
            ""
          );
        }
        return "";
      })
      .filter(Boolean)
      .map((s: string) => s.toLowerCase().trim());
  }
  if (typeof components === "object") {
    return Object.keys(components).map((s) => s.toLowerCase().trim());
  }
  return [];
}

/**
 * Resolve the package linked to an admission. Falls back to the most recent
 * package_bookings row for the patient when `admissions.package_id` is not
 * present in the schema.
 */
async function resolveAdmissionPackage(
  admissionId: string,
  hospitalId: string,
  packageIdHint?: string | null,
): Promise<{
  packageId: string | null;
  pkg: any | null;
  patientId: string | null;
  admittedAt: string | null;
  wardId: string | null;
}> {
  const { data: admission, error: admErr } = await (supabase as any)
    .from("admissions")
    .select("id, patient_id, admitted_at, ward_id, package_id")
    .eq("id", admissionId)
    .eq("hospital_id", hospitalId)
    .maybeSingle();

  if (admErr) {
    console.error("Package excess: admission lookup failed:", admErr.message);
  }
  if (!admission) {
    return { packageId: null, pkg: null, patientId: null, admittedAt: null, wardId: null };
  }

  let packageId: string | null =
    packageIdHint || (admission as any).package_id || null;

  // Fallback: find most recent active booking for this patient.
  if (!packageId && admission.patient_id) {
    const { data: bookings } = await (supabase as any)
      .from("package_bookings")
      .select("id, package_id, scheduled_date, status, created_at")
      .eq("hospital_id", hospitalId)
      .eq("patient_id", admission.patient_id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (bookings && bookings.length > 0) {
      packageId = bookings[0].package_id;
    }
  }

  if (!packageId) {
    return {
      packageId: null,
      pkg: null,
      patientId: admission.patient_id,
      admittedAt: admission.admitted_at,
      wardId: admission.ward_id,
    };
  }

  const { data: pkg, error: pkgErr } = await (supabase as any)
    .from("health_packages")
    .select("*")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgErr) {
    console.error("Package excess: package lookup failed:", pkgErr.message);
  }

  return {
    packageId,
    pkg,
    patientId: admission.patient_id,
    admittedAt: admission.admitted_at,
    wardId: admission.ward_id,
  };
}

/**
 * Run the excess detection for an admission. Safe to call repeatedly (read-only
 * — never mutates data).
 */
export async function checkPackageExcess(
  admissionId: string,
  hospitalIdOrPackageId: string,
  hospitalIdMaybe?: string,
): Promise<PackageExcessResult> {
  // Backward-compatible signature:
  //   checkPackageExcess(admissionId, hospitalId)
  //   checkPackageExcess(admissionId, packageId, hospitalId)
  const hospitalId = hospitalIdMaybe ?? hospitalIdOrPackageId;
  const packageHint = hospitalIdMaybe ? hospitalIdOrPackageId : null;

  if (!admissionId || !hospitalId) return EMPTY_RESULT;

  const { packageId, pkg, admittedAt, wardId } = await resolveAdmissionPackage(
    admissionId,
    hospitalId,
    packageHint,
  );

  if (!packageId || !pkg) return EMPTY_RESULT;

  // ----- Coverage definition (schema-tolerant) -----
  const inclusionNames = extractInclusionNames(
    (pkg as any).package_inclusions ?? (pkg as any).components,
  );

  // LOS — fallback derived from estimated_hours (≥24h => 1 day).
  const explicitLos =
    Number((pkg as any).package_los_days) ||
    Number((pkg as any).los_days) ||
    0;
  const estHours = Number((pkg as any).estimated_hours) || 0;
  const packageLosDays =
    explicitLos > 0
      ? explicitLos
      : estHours > 0
        ? Math.max(1, Math.ceil(estHours / 24))
        : 1;

  const packageRoomType: string | null =
    ((pkg as any).package_room_type as string | undefined)?.toLowerCase() ||
    ((pkg as any).room_type as string | undefined)?.toLowerCase() ||
    null;

  // ----- Bills + line items for this admission -----
  const { data: bills } = await (supabase as any)
    .from("bills")
    .select("id, bill_type, bill_status")
    .eq("hospital_id", hospitalId)
    .eq("admission_id", admissionId);

  const billRows = (bills || []) as Array<{
    id: string;
    bill_type: string | null;
    bill_status: string | null;
  }>;
  const billIds = billRows.map((b) => b.id);

  // Detect any pre-existing excess bill so we can short-circuit re-creation.
  const existingExcess = billRows.find((b) => b.bill_type === "package_excess");
  let existingExcessBill: PackageExcessResult["existingExcessBill"] = null;
  if (existingExcess) {
    const { data: full } = await (supabase as any)
      .from("bills")
      .select("id, bill_number, payment_status, total_amount, notes")
      .eq("id", existingExcess.id)
      .maybeSingle();
    if (full) {
      existingExcessBill = {
        id: full.id,
        bill_number: full.bill_number || null,
        payment_status: full.payment_status || null,
        total_amount: Number(full.total_amount) || 0,
        waived: typeof full.notes === "string" && full.notes.toLowerCase().includes("[waived]"),
      };
    }
  }

  let lineItems: any[] = [];
  if (billIds.length > 0) {
    // Skip excess bills themselves when calculating excess (avoids self-reference).
    const nonExcessIds = billRows
      .filter((b) => b.bill_type !== "package_excess")
      .map((b) => b.id);
    if (nonExcessIds.length > 0) {
      const { data } = await (supabase as any)
        .from("bill_line_items")
        .select("id, bill_id, description, item_type, quantity, unit_rate, total_amount, service_id")
        .in("bill_id", nonExcessIds);
      lineItems = data || [];
    }
  }

  const excessItems: PackageExcessItem[] = [];

  // (c) Uncovered services — exclude room/ward charges (handled separately below).
  for (const it of lineItems) {
    const desc: string = (it.description || "").toLowerCase().trim();
    const type: string = (it.item_type || "").toLowerCase();
    if (type === "room_charge" || type === "ward_charge") continue;
    if (!desc) continue;

    const covered = inclusionNames.some(
      (inc) => inc && (desc.includes(inc) || inc.includes(desc)),
    );
    if (!covered) {
      excessItems.push({
        kind: "uncovered_service",
        description: it.description || "Unnamed item",
        amount: Number(it.total_amount) || 0,
        lineItemId: it.id,
      });
    }
  }

  // (d) Extra LOS days
  let actualDays = 0;
  if (admittedAt) {
    const ms = Date.now() - new Date(admittedAt).getTime();
    actualDays = Math.max(1, Math.ceil(ms / 86_400_000));
  }
  if (actualDays > packageLosDays) {
    const extraDays = actualDays - packageLosDays;
    // Per-day rate: prefer the room_charge line on the bill, else 0.
    const roomLine = lineItems.find(
      (it) =>
        (it.item_type || "").toLowerCase() === "room_charge" ||
        (it.item_type || "").toLowerCase() === "ward_charge",
    );
    const perDay = Number(roomLine?.unit_rate) || 0;
    excessItems.push({
      kind: "extra_los_day",
      description: `Extra stay: ${extraDays} day${extraDays === 1 ? "" : "s"} beyond package LOS (${packageLosDays})`,
      amount: perDay * extraDays,
      count: extraDays,
    });
  }

  // (e) Room upgrade differential
  if (packageRoomType && wardId) {
    const { data: ward } = await (supabase as any)
      .from("wards")
      .select("id, ward_type, rate_per_day")
      .eq("id", wardId)
      .maybeSingle();
    const actualType = (ward?.ward_type || "").toLowerCase();
    if (actualType && actualType !== packageRoomType) {
      // Try to look up the package room rate for the differential.
      const { data: pkgWard } = await (supabase as any)
        .from("wards")
        .select("rate_per_day")
        .eq("hospital_id", hospitalId)
        .ilike("ward_type", packageRoomType)
        .limit(1);
      const pkgRate = Number(pkgWard?.[0]?.rate_per_day) || 0;
      const actualRate = Number(ward?.rate_per_day) || 0;
      const diffPerDay = Math.max(0, actualRate - pkgRate);
      const diffDays = Math.min(actualDays || 1, packageLosDays);
      if (diffPerDay > 0) {
        excessItems.push({
          kind: "room_upgrade",
          description: `Room upgrade: ${packageRoomType} → ${actualType} (${diffDays} day${diffDays === 1 ? "" : "s"} × ₹${diffPerDay}/day differential)`,
          amount: diffPerDay * diffDays,
          count: diffDays,
        });
      }
    }
  }

  const excessAmount = excessItems.reduce((s, i) => s + (i.amount || 0), 0);

  return {
    linked: true,
    packageId,
    packageName: (pkg as any).package_name || null,
    excessItems,
    excessAmount,
    existingExcessBill,
  };
}

/**
 * True when the admission's discharge Summary step should be blocked because
 * an excess bill exists but is neither paid nor waived. Read-only.
 */
export async function isPackageExcessBlocking(
  admissionId: string,
  hospitalId: string,
): Promise<boolean> {
  if (!admissionId || !hospitalId) return false;
  const { data: bill } = await (supabase as any)
    .from("bills")
    .select("id, payment_status, notes")
    .eq("hospital_id", hospitalId)
    .eq("admission_id", admissionId)
    .eq("bill_type", "package_excess")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!bill) return false;
  const paid = (bill.payment_status || "").toLowerCase() === "paid";
  const waived =
    typeof bill.notes === "string" && bill.notes.toLowerCase().includes("[waived]");
  return !(paid || waived);
}
