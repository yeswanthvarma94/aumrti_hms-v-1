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
      // 1. Total patients
      const { count: totalPatients } = await supabase
        .from("patients").select("*", { count: "exact", head: true });

      // 2. Patients created today
      const today = new Date().toISOString().split("T")[0];
      const { count: patientsToday } = await supabase
        .from("patients").select("*", { count: "exact", head: true })
        .gte("created_at", today + "T00:00:00")
        .lt("created_at", today + "T23:59:59.999Z");

      // 3. Beds
      const { data: bedsData } = await supabase.from("beds").select("status");
      const bedsTotal = bedsData?.length || 0;
      const bedsOccupied = bedsData?.filter(b => b.status === "occupied").length || 0;

      // 4. OPD visits today
      const { data: opdData } = await supabase
        .from("opd_visits").select("status")
        .eq("visit_date", today);
      const opdFiltered = opdData?.filter(v => v.status !== "cancelled") || [];
      const opdActive = opdFiltered.length;
      const opdWaiting = opdFiltered.filter(v => v.status === "waiting").length;
      const opdSeen = opdFiltered.filter(v => v.status === "completed").length;

      // 5. Revenue MTD
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: billsThisMonth } = await supabase
        .from("bills").select("paid_amount")
        .gte("bill_date", monthStart);
      const revenueMTD = billsThisMonth?.reduce((s, b) => s + Number(b.paid_amount), 0) || 0;

      // Last month revenue
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const { data: billsLastMonth } = await supabase
        .from("bills").select("paid_amount")
        .gte("bill_date", lastMonth.toISOString().split("T")[0])
        .lte("bill_date", lastMonthEnd.toISOString().split("T")[0]);
      const revenueLastMonth = billsLastMonth?.reduce((s, b) => s + Number(b.paid_amount), 0) || 0;

      // 6. Doctors
      const { count: totalDoctors } = await supabase
        .from("users").select("*", { count: "exact", head: true })
        .eq("role", "doctor").eq("is_active", true);

      const { count: onLeave } = await supabase
        .from("staff_attendance").select("*", { count: "exact", head: true })
        .eq("attendance_date", today).eq("status", "leave");

      const doctorsOnLeave = onLeave || 0;
      const doctorsOnDuty = (totalDoctors || 0) - doctorsOnLeave;

      // 7. Critical alerts
      const alertQuery = supabase
        .from("clinical_alerts").select("id", { count: "exact", head: true })
        .eq("is_acknowledged", false);
      if (hospitalIdRef.current) alertQuery.eq("hospital_id", hospitalIdRef.current);
      const { count: criticalAlerts } = await alertQuery;

      setKpis({
        totalPatients: totalPatients || 0,
        patientsToday: patientsToday || 0,
        bedsOccupied, bedsTotal,
        opdActive, opdWaiting, opdSeen,
        revenueMTD, revenueLastMonth,
        doctorsOnDuty, doctorsOnLeave,
        criticalAlerts: criticalAlerts || 0,
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
    const init = async () => {
      // Get hospital_id for realtime filters
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("hospital_id")const { data } = await supabase.from("users").select("hospital_id").eq("auth_user_id", user.id).single();
        if (data) hospitalIdRef.current = data.hospital_id;
      }
      await fetchAll();
    };
    init();
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
