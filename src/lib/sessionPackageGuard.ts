import { supabase } from "@/integrations/supabase/client";

export type SessionServiceType = "dialysis" | "physio" | "dental";

export interface ActivePackageInfo {
  bookingId: string;
  packageId: string;
  packageName: string;
  sessionsIncluded: number;
  sessionsUsed: number;
  ratePerSession: number;
}

const SERVICE_KEYWORDS: Record<SessionServiceType, string[]> = {
  dialysis: ["dialysis", "haemodialysis", "hemodialysis"],
  physio: ["physio", "physiotherapy", "rehab"],
  dental: ["dental", "scaling", "endodontic", "rct"],
};

const componentMatches = (comp: any, type: SessionServiceType): boolean => {
  if (!comp) return false;
  const haystacks = [comp.name, comp.title, comp.service_name, comp.category, comp.type, comp.code]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  const keywords = SERVICE_KEYWORDS[type];
  return haystacks.some((h) => keywords.some((k) => h.includes(k)));
};

const extractSessionsAndRate = (comp: any): { sessions: number; rate: number } => {
  if (!comp) return { sessions: 0, rate: 0 };
  const sessions =
    Number(comp.sessions || comp.session_count || comp.quantity || comp.count || 0) || 0;
  const rate =
    Number(comp.rate || comp.unit_rate || comp.price_per_session || comp.price || 0) || 0;
  return { sessions, rate };
};

/**
 * Look up an active package booking that includes the given service type for this patient.
 * Schema-tolerant: scans health_packages.components JSONB for any element matching the service.
 */
export async function findActivePackageForService(
  patientId: string,
  hospitalId: string,
  type: SessionServiceType
): Promise<ActivePackageInfo | null> {
  if (!patientId || !hospitalId) return null;

  const { data: bookings, error } = await (supabase as any)
    .from("package_bookings")
    .select("id, package_id, status, components_done, scheduled_date, booking_date")
    .eq("patient_id", patientId)
    .eq("hospital_id", hospitalId)
    .in("status", ["active", "in_progress", "scheduled", "ongoing"])
    .order("booking_date", { ascending: false });

  if (error) {
    console.error("Failed to load package bookings:", error.message);
    return null;
  }
  if (!bookings || bookings.length === 0) return null;

  for (const b of bookings) {
    const { data: pkg } = await (supabase as any)
      .from("health_packages")
      .select("id, package_name, components, price")
      .eq("id", b.package_id)
      .maybeSingle();
    if (!pkg) continue;

    const components: any[] = Array.isArray(pkg.components) ? pkg.components : [];
    const matching = components.find((c) => componentMatches(c, type));
    if (!matching) continue;

    const { sessions, rate } = extractSessionsAndRate(matching);
    if (sessions <= 0) continue;

    // Count used: prefer components_done counter if present, else 0 (caller will compute from session table)
    const done: any = b.components_done || {};
    const usedFromBooking = Number(
      done?.[type] ?? done?.[matching?.code ?? ""] ?? done?.[matching?.name ?? ""] ?? 0
    );

    return {
      bookingId: b.id,
      packageId: pkg.id,
      packageName: pkg.package_name,
      sessionsIncluded: sessions,
      sessionsUsed: usedFromBooking,
      ratePerSession: rate,
    };
  }
  return null;
}

/**
 * Counts sessions actually performed under an active package, using the relevant module's
 * session table. Falls back to the components_done value if a session table query fails.
 */
export async function countPackageSessionsUsed(
  pkg: ActivePackageInfo,
  patientId: string,
  hospitalId: string,
  type: SessionServiceType
): Promise<number> {
  try {
    if (type === "physio") {
      const { count } = await (supabase as any)
        .from("physio_sessions")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("hospital_id", hospitalId);
      return count ?? pkg.sessionsUsed;
    }
    if (type === "dialysis") {
      const { data: dp } = await (supabase as any)
        .from("dialysis_patients")
        .select("id")
        .eq("patient_id", patientId)
        .eq("hospital_id", hospitalId)
        .maybeSingle();
      if (!dp?.id) return pkg.sessionsUsed;
      const { count } = await (supabase as any)
        .from("dialysis_sessions")
        .select("id", { count: "exact", head: true })
        .eq("dialysis_patient_id", dp.id)
        .eq("hospital_id", hospitalId);
      return count ?? pkg.sessionsUsed;
    }
    if (type === "dental") {
      // No dental session table — count completed line items in dental treatment plans.
      const { count } = await (supabase as any)
        .from("bill_line_items")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("source_module", "dental");
      return count ?? pkg.sessionsUsed;
    }
  } catch (e) {
    console.warn("countPackageSessionsUsed fallback:", (e as Error).message);
  }
  return pkg.sessionsUsed;
}

/**
 * Returns billing gap counts for a patient in a given service module.
 * billed = bill_line_items where source_module=type AND bill.patient_id=patientId
 * total  = rows in module's session table for the patient
 */
export async function getPatientSessionBillingCounts(
  patientId: string,
  hospitalId: string,
  type: SessionServiceType
): Promise<{ total: number; billed: number; unbilled: number }> {
  let total = 0;
  if (type === "physio") {
    const { count } = await (supabase as any)
      .from("physio_sessions")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .eq("hospital_id", hospitalId);
    total = count ?? 0;
  } else if (type === "dialysis") {
    const { data: dp } = await (supabase as any)
      .from("dialysis_patients")
      .select("id")
      .eq("patient_id", patientId)
      .eq("hospital_id", hospitalId)
      .maybeSingle();
    if (dp?.id) {
      const { count } = await (supabase as any)
        .from("dialysis_sessions")
        .select("id", { count: "exact", head: true })
        .eq("dialysis_patient_id", dp.id)
        .eq("hospital_id", hospitalId);
      total = count ?? 0;
    }
  } else if (type === "dental") {
    // No dedicated session table — derive from completed treatment-plan items that should have billed.
    const { data: plans } = await (supabase as any)
      .from("dental_treatment_plans")
      .select("plan_items")
      .eq("patient_id", patientId)
      .eq("hospital_id", hospitalId);
    (plans || []).forEach((pl: any) => {
      const items: any[] = Array.isArray(pl.plan_items) ? pl.plan_items : [];
      total += items.filter(
        (it) => it && it.status === "completed" && Number(it.cost || 0) > 0
      ).length;
    });
  }

  // Count billed line items for this patient/module
  const { data: bills } = await (supabase as any)
    .from("bills")
    .select("id")
    .eq("patient_id", patientId)
    .eq("hospital_id", hospitalId);
  const billIds = (bills || []).map((b: any) => b.id);
  let billed = 0;
  if (billIds.length > 0) {
    const { count } = await (supabase as any)
      .from("bill_line_items")
      .select("id", { count: "exact", head: true })
      .in("bill_id", billIds)
      .eq("source_module", type);
    billed = count ?? 0;
  }

  const unbilled = Math.max(0, total - billed);
  return { total, billed, unbilled };
}
