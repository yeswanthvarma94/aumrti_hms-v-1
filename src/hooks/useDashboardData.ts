import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const hospitalIdRef = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      // Resolve hospital_id before any queries
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      if (!hospitalIdRef.current) {
        const { data } = await supabase.from("users").select("hospital_id").eq("auth_user_id", user.id).maybeSingle();
        if (data) hospitalIdRef.current = data.hospital_id;
      }
      const hid = hospitalIdRef.current;
      if (!hid) { setLoading(false); return; }

      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fire all queries in parallel with Promise.allSettled for resilience
      const results = await Promise.allSettled([
        // 0: Total patients
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("hospital_id", hid),
        // 1: Patients today
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("hospital_id", hid)
          .gte("created_at", today + "T00:00:00").lt("created_at", today + "T23:59:59.999Z"),
        // 2: Beds
        supabase.from("beds").select("status").eq("hospital_id", hid),
        // 3: OPD visits today
        supabase.from("opd_visits").select("status").eq("hospital_id", hid).eq("visit_date", today),
        // 4: Revenue MTD
        supabase.from("bills").select("paid_amount").eq("hospital_id", hid).gte("bill_date", monthStart),
        // 5: Revenue last month
        supabase.from("bills").select("paid_amount").eq("hospital_id", hid)
          .gte("bill_date", lastMonth.toISOString().split("T")[0])
          .lte("bill_date", lastMonthEnd.toISOString().split("T")[0]),
        // 6: Total doctors
        supabase.from("users").select("*", { count: "exact", head: true }).eq("hospital_id", hid)
          .eq("role", "doctor").eq("is_active", true),
        // 7: On leave
        supabase.from("staff_attendance").select("*", { count: "exact", head: true }).eq("hospital_id", hid)
          .eq("attendance_date", today).eq("status", "leave"),
        // 8: Critical alerts
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
  }, []);

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

  // Realtime subscriptions
  useEffect(() => {
    const hid = hospitalIdRef.current;
    if (!hid) return;

    const channel = supabase.channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "beds", filter: `hospital_id=eq.${hid}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_visits", filter: `hospital_id=eq.${hid}` }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clinical_alerts", filter: `hospital_id=eq.${hid}` }, (payload: any) => {
        fetchAll();
        if (payload.new?.severity === "critical") {
          toast({ title: "🚨 Critical Alert", description: payload.new.alert_message, variant: "destructive" });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll, toast, loading]); // re-subscribe when hospitalId is available after loading

  return { kpis, loading, seeding, seedData, refetch: fetchAll };
}
