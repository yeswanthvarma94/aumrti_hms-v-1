import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";

export interface DashboardKPIs {
  totalPatients: number;
  patientsToday: number;
  bedsOccupied: number;
  bedsTotal: number;
  opdActive: number;
  opdWaiting: number;
  opdSeen: number;
  revenueMTD: number;
  revenueLastMonth: number;
  doctorsOnDuty: number;
  doctorsOnLeave: number;
  criticalAlerts: number;
}

const empty: DashboardKPIs = {
  totalPatients: 0, patientsToday: 0,
  bedsOccupied: 0, bedsTotal: 0,
  opdActive: 0, opdWaiting: 0, opdSeen: 0,
  revenueMTD: 0, revenueLastMonth: 0,
  doctorsOnDuty: 0, doctorsOnLeave: 0,
  criticalAlerts: 0,
};

/**
 * Fallback to the legacy 9-query path if the `get_dashboard_kpis` RPC
 * isn't deployed yet. Once the migration is applied this branch is never
 * taken.
 */
async function fetchKPIsLegacy(hid: string, today: string): Promise<DashboardKPIs> {
  const now = new Date(today);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const results = await Promise.allSettled([
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("hospital_id", hid),
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("hospital_id", hid)
      .gte("created_at", today + "T00:00:00").lt("created_at", today + "T23:59:59.999Z"),
    supabase.from("beds").select("status").eq("hospital_id", hid),
    supabase.from("opd_visits").select("status").eq("hospital_id", hid).eq("visit_date", today),
    supabase.from("bills").select("paid_amount").eq("hospital_id", hid).gte("bill_date", monthStart),
    supabase.from("bills").select("paid_amount").eq("hospital_id", hid)
      .gte("bill_date", lastMonth.toISOString().split("T")[0])
      .lte("bill_date", lastMonthEnd.toISOString().split("T")[0]),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("hospital_id", hid)
      .eq("role", "doctor").eq("is_active", true),
    supabase.from("staff_attendance").select("*", { count: "exact", head: true }).eq("hospital_id", hid)
      .eq("attendance_date", today).eq("status", "leave"),
    supabase.from("clinical_alerts").select("id", { count: "exact", head: true }).eq("hospital_id", hid)
      .eq("is_acknowledged", false),
  ]);

  const val = <T,>(idx: number, fallback: T): T => {
    const r = results[idx];
    if (r.status === "fulfilled") return r.value as unknown as T;
    return fallback;
  };

  const totalPatientsRes = val<any>(0, { count: 0 });
  const patientsTodayRes = val<any>(1, { count: 0 });
  const bedsRes = val<any>(2, { data: [] });
  const opdRes = val<any>(3, { data: [] });
  const billsMTDRes = val<any>(4, { data: [] });
  const billsLastRes = val<any>(5, { data: [] });
  const totalDoctorsRes = val<any>(6, { count: 0 });
  const onLeaveRes = val<any>(7, { count: 0 });
  const alertsRes = val<any>(8, { count: 0 });

  const bedsData = bedsRes.data || [];
  const opdData = (opdRes.data || []).filter((v: any) => v.status !== "cancelled");

  return {
    totalPatients: totalPatientsRes.count || 0,
    patientsToday: patientsTodayRes.count || 0,
    bedsOccupied: bedsData.filter((b: any) => b.status === "occupied").length,
    bedsTotal: bedsData.length,
    opdActive: opdData.length,
    opdWaiting: opdData.filter((v: any) => v.status === "waiting").length,
    opdSeen: opdData.filter((v: any) => v.status === "completed").length,
    revenueMTD: (billsMTDRes.data || []).reduce((s: number, b: any) => s + Number(b.paid_amount), 0),
    revenueLastMonth: (billsLastRes.data || []).reduce((s: number, b: any) => s + Number(b.paid_amount), 0),
    doctorsOnDuty: Math.max(0, (totalDoctorsRes.count || 0) - (onLeaveRes.count || 0)),
    doctorsOnLeave: onLeaveRes.count || 0,
    criticalAlerts: alertsRes.count || 0,
  };
}

async function fetchKPIs(hospitalId: string, today: string): Promise<DashboardKPIs> {
  // Prefer the single-call RPC.
  const { data, error } = await supabase.rpc("get_dashboard_kpis" as any, {
    p_hospital_id: hospitalId,
    p_today: today,
  } as any);

  if (!error && data) {
    const k = data as any;
    return {
      totalPatients: Number(k.totalPatients) || 0,
      patientsToday: Number(k.patientsToday) || 0,
      bedsOccupied: Number(k.bedsOccupied) || 0,
      bedsTotal: Number(k.bedsTotal) || 0,
      opdActive: Number(k.opdActive) || 0,
      opdWaiting: Number(k.opdWaiting) || 0,
      opdSeen: Number(k.opdSeen) || 0,
      revenueMTD: Number(k.revenueMTD) || 0,
      revenueLastMonth: Number(k.revenueLastMonth) || 0,
      doctorsOnDuty: Number(k.doctorsOnDuty) || 0,
      doctorsOnLeave: Number(k.doctorsOnLeave) || 0,
      criticalAlerts: Number(k.criticalAlerts) || 0,
    };
  }

  // RPC not deployed yet — fall back to the legacy parallel queries.
  console.warn("get_dashboard_kpis RPC not available, falling back to per-query path:", error?.message);
  return fetchKPIsLegacy(hospitalId, today);
}

export function useDashboardData() {
  const { hospitalId, loading: hospitalLoading } = useHospitalId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const { data: kpis = empty, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-kpis", hospitalId, today],
    queryFn: () => fetchKPIs(hospitalId as string, today),
    enabled: !!hospitalId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const loading = hospitalLoading || (!!hospitalId && isLoading);

  // Debounced realtime invalidation — coalesces bursts of events
  const invalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", hospitalId] });
    }, 500);
  }, [queryClient, hospitalId]);

  useEffect(() => {
    if (!hospitalId) return;

    const channel = supabase.channel(`dashboard-realtime-${hospitalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "beds", filter: `hospital_id=eq.${hospitalId}` }, () => invalidate())
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_visits", filter: `hospital_id=eq.${hospitalId}` }, () => invalidate())
      .on("postgres_changes", { event: "*", schema: "public", table: "bills", filter: `hospital_id=eq.${hospitalId}` }, () => invalidate())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clinical_alerts", filter: `hospital_id=eq.${hospitalId}` }, (payload: any) => {
        invalidate();
        if (payload.new?.severity === "critical") {
          toast({ title: "🚨 Critical Alert", description: payload.new.alert_message, variant: "destructive" });
        }
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [hospitalId, invalidate, toast]);

  const seedData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("seed-dashboard", {});
      if (res.data?.seeded) {
        toast({ title: "Sample data loaded", description: "Dashboard now shows live data." });
        await refetch();
      }
    } catch (err) {
      console.error("Seed error:", err);
    }
  }, [refetch, toast]);

  return {
    kpis,
    loading,
    seeding: false,
    seedData,
    refetch: () => refetch().then(() => undefined),
  };
}
