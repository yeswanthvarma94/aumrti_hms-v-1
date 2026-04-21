import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getHospitalIdAsync } from "@/hooks/useHospitalId";

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

export function useDashboardData() {
  const [kpis, setKpis] = useState<DashboardKPIs>(empty);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async (hidOverride?: string) => {
    try {
      const hid = hidOverride || hospitalId;
      if (!hid) {
        const resolved = await getHospitalIdAsync();
        if (!resolved) { setLoading(false); return; }
        setHospitalId(resolved);
        return; // effect will re-run fetch with new hid
      }

      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
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
        console.warn(`Dashboard query ${idx} failed:`, (r as PromiseRejectedResult).reason);
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

      setKpis({
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
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  // Debounced refetch — coalesces bursts of realtime events
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchAll(); }, 500);
  }, [fetchAll]);

  const seedData = useCallback(async () => {
    setSeeding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("seed-dashboard", {});
      if (res.data?.seeded) {
        toast({ title: "Sample data loaded", description: "Dashboard now shows live data." });
        await fetchAll();
      }
    } catch (err) {
      console.error("Seed error:", err);
    } finally {
      setSeeding(false);
    }
  }, [fetchAll, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime — stable channel, only re-subscribes when hospitalId actually changes
  useEffect(() => {
    if (!hospitalId) return;

    const channel = supabase.channel(`dashboard-realtime-${hospitalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "beds", filter: `hospital_id=eq.${hospitalId}` }, () => debouncedFetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_visits", filter: `hospital_id=eq.${hospitalId}` }, () => debouncedFetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clinical_alerts", filter: `hospital_id=eq.${hospitalId}` }, (payload: any) => {
        debouncedFetch();
        if (payload.new?.severity === "critical") {
          toast({ title: "🚨 Critical Alert", description: payload.new.alert_message, variant: "destructive" });
        }
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [hospitalId, debouncedFetch, toast]);

  return { kpis, loading, seeding, seedData, refetch: fetchAll };
}
