import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowLeft, Clock, Users, BedDouble, IndianRupee,
  AlertTriangle, Activity, LogOut,
} from "lucide-react";

const REFRESH_MS = 30_000;
const DONUT_COLORS = ["hsl(var(--primary))", "#10B981", "#F59E0B"];

const HODDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [opdCount, setOpdCount] = useState(0);
  const [opdYesterday, setOpdYesterday] = useState(0);
  const [opdWeek, setOpdWeek] = useState<{ day: string; count: number }[]>([]);
  const [beds, setBeds] = useState({ occupied: 0, available: 0, total: 0 });
  const [revenue, setRevenue] = useState({ collected: 0, outstanding: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [pendingLab, setPendingLab] = useState(0);
  const [staffPresent, setStaffPresent] = useState(0);
  const [staffAbsent, setStaffAbsent] = useState(0);
  const [doctorCount, setDoctorCount] = useState(0);
  const [nurseCount, setNurseCount] = useState(0);
  const [dischargeTat, setDischargeTat] = useState(0);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchAll = useCallback(async () => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // OPD today
    const { count: opdC } = await supabase.from("opd_tokens").select("id", { count: "exact", head: true }).eq("visit_date", today);
    setOpdCount(opdC || 0);

    // OPD yesterday
    const { count: opdY } = await supabase.from("opd_tokens").select("id", { count: "exact", head: true }).eq("visit_date", format(yesterdayStart, "yyyy-MM-dd"));
    setOpdYesterday(opdY || 0);

    // OPD last 7 days
    const weekData: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = format(d, "yyyy-MM-dd");
      const { count: c } = await supabase.from("opd_tokens").select("id", { count: "exact", head: true }).eq("visit_date", ds);
      weekData.push({ day: format(d, "EEE"), count: c || 0 });
    }
    setOpdWeek(weekData);

    // Beds
    const { data: bedData } = await supabase.from("beds").select("status").eq("is_active", true);
    if (bedData) {
      const occ = bedData.filter(b => b.status === "occupied").length;
      const avail = bedData.filter(b => b.status === "available").length;
      setBeds({ occupied: occ, available: avail, total: bedData.length });
    }

    // Revenue
    const { data: billData } = await supabase.from("bills").select("paid_amount, balance_due").eq("bill_date", today);
    if (billData) {
      setRevenue({
        collected: billData.reduce((s, b) => s + (b.paid_amount || 0), 0),
        outstanding: billData.reduce((s, b) => s + (b.balance_due || 0), 0),
      });
    }

    // Alerts
    const { data: alertData, count: aC } = await supabase.from("clinical_alerts").select("*", { count: "exact" }).eq("is_acknowledged", false).order("created_at", { ascending: false }).limit(10);
    setAlerts(alertData || []);
    setAlertCount(aC || 0);

    // Pending lab
    const { count: labC } = await supabase.from("lab_order_items").select("id", { count: "exact", head: true }).eq("status", "ordered");
    setPendingLab(labC || 0);

    // Staff attendance
    const { data: attData } = await supabase.from("staff_attendance").select("status, users(role)").eq("attendance_date", today);
    if (attData) {
      const present = attData.filter(a => a.status === "present");
      setStaffPresent(present.length);
      setStaffAbsent(attData.filter(a => a.status === "absent").length);
      setDoctorCount(present.filter(a => (a as any).users?.role === "doctor").length);
      setNurseCount(present.filter(a => (a as any).users?.role === "nurse").length);
    }

    // Discharge TAT (avg hours for today's discharges)
    const { data: discharges } = await supabase.from("admissions").select("admitted_at, discharged_at").eq("status", "discharged").not("discharged_at", "is", null).gte("discharged_at", todayStart.toISOString());
    if (discharges && discharges.length > 0) {
      const totalHrs = discharges.reduce((s, d) => {
        const hrs = (new Date(d.discharged_at!).getTime() - new Date(d.admitted_at!).getTime()) / 3600000;
        return s + hrs;
      }, 0);
      setDischargeTat(totalHrs / discharges.length);
    }
  }, [today]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const opdDiff = opdCount - opdYesterday;
  const bedPct = beds.total > 0 ? Math.round((beds.occupied / beds.total) * 100) : 0;
  const donutData = [
    { name: "Occupied", value: beds.occupied },
    { name: "Available", value: beds.available },
    { name: "Other", value: Math.max(0, beds.total - beds.occupied - beds.available) },
  ];
  const tatHours = Math.floor(dischargeTat);
  const tatMinutes = Math.round((dischargeTat - tatHours) * 60);

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="h-[52px] bg-sidebar text-white flex items-center px-6 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mr-6">
          <ArrowLeft size={16} /> Back to HMS
        </button>
        <Activity size={20} className="mr-2" />
        <h1 className="text-base font-bold">HOD Control Tower</h1>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-white/80">{format(now, "dd MMM yyyy")}</span>
          <span className="text-sm font-mono font-bold">{format(now, "HH:mm:ss")}</span>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 grid grid-cols-3 grid-rows-2 gap-4 p-4 overflow-hidden">
        {/* Tile 1: OPD */}
        <div className="bg-background rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-primary" />
            <span className="text-sm text-muted-foreground">OPD Patients Today</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold text-primary">{opdCount}</span>
            <span className={`text-xs font-medium mb-2 ${opdDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {opdDiff >= 0 ? "↑" : "↓"} {Math.abs(opdDiff)} vs yesterday
            </span>
          </div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opdWeek}>
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tile 2: Bed Occupancy */}
        <div className="bg-background rounded-2xl p-6 flex flex-col items-center justify-center">
          <span className="text-sm text-muted-foreground mb-2">Bed Occupancy</span>
          <div className="relative w-[140px] h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{bedPct}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Occupied: {beds.occupied} · Available: {beds.available}
          </p>
        </div>

        {/* Tile 3: Revenue */}
        <div className="bg-background rounded-2xl p-6 flex flex-col justify-center">
          <IndianRupee size={18} className="text-emerald-600 mb-1" />
          <span className="text-4xl font-bold text-emerald-700">₹{revenue.collected.toLocaleString("en-IN")}</span>
          <span className="text-sm text-muted-foreground mt-1">Collected Today</span>
          {revenue.outstanding > 0 && (
            <span className="text-xs text-amber-600 mt-2">₹{revenue.outstanding.toLocaleString("en-IN")} outstanding</span>
          )}
        </div>

        {/* Tile 4: Pending Actions */}
        <div className="bg-background rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <span className="text-sm font-bold">Pending Actions</span>
            {alertCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{alertCount}</span>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <p className={alertCount > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
              ⚠️ {alertCount} Critical Alerts
            </p>
            <p className="text-muted-foreground">📋 {pendingLab} Pending Lab Orders</p>
          </div>
        </div>

        {/* Tile 5: Discharge TAT */}
        <div className="bg-background rounded-2xl p-6 flex flex-col items-center justify-center">
          <Clock size={18} className="text-primary mb-2" />
          <span className="text-sm text-muted-foreground">Avg Discharge TAT</span>
          <span className={`text-3xl font-bold mt-1 ${dischargeTat > 3 ? "text-red-600" : "text-emerald-600"}`}>
            {tatHours}h {tatMinutes}m
          </span>
          <span className="text-xs text-muted-foreground mt-2">NABH Target: 3 hrs</span>
        </div>

        {/* Tile 6: Staff */}
        <div className="bg-background rounded-2xl p-6 flex flex-col justify-center">
          <BedDouble size={18} className="text-primary mb-1" />
          <span className="text-4xl font-bold text-primary">{staffPresent}</span>
          <span className="text-sm text-muted-foreground mt-1">Staff Present Today</span>
          <p className="text-xs text-muted-foreground mt-2">
            Doctors: {doctorCount} · Nurses: {nurseCount} · Others: {staffPresent - doctorCount - nurseCount}
          </p>
          {staffAbsent > 0 && <p className="text-xs text-red-500 mt-1">{staffAbsent} absent today</p>}
        </div>
      </main>

      {/* Alert ticker */}
      {alerts.length > 0 && (
        <div className="h-[52px] bg-amber-100 flex items-center overflow-hidden shrink-0">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12 px-6">
            {alerts.map((a, i) => (
              <span key={i} className="text-sm text-foreground">
                {a.severity === "critical" ? "🚨" : "⚠️"} {a.alert_message}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboardPage;
