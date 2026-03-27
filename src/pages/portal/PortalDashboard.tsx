import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, FlaskConical, Receipt, Pill, Download } from "lucide-react";
import type { PortalSession } from "./PortalLogin";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const PortalDashboard: React.FC<{ session: PortalSession }> = ({ session }) => {
  const navigate = useNavigate();
  const [upcomingAppt, setUpcomingAppt] = useState<any>(null);
  const [activeAdmission, setActiveAdmission] = useState<any>(null);
  const [counts, setCounts] = useState({ appointments: 0, reports: 0, billsDue: 0, prescriptions: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    const pid = session.patientId;
    const hid = session.hospitalId;
    const today = new Date().toISOString().slice(0, 10);

    // Upcoming appointment
    const { data: tokens } = await supabase
      .from("opd_tokens")
      .select("id, token_number, visit_date, status, doctor_id")
      .eq("patient_id", pid)
      .eq("hospital_id", hid)
      .gte("visit_date", today)
      .not("status", "in", '("cancelled","completed")')
      .order("visit_date", { ascending: true })
      .limit(1);

    if (tokens?.[0]) {
      const token = tokens[0];
      // Get doctor name
      if (token.doctor_id) {
        const { data: doc } = await supabase
          .from("users")
          .select("full_name, department_id")
          .eq("id", token.doctor_id)
          .maybeSingle();
        if (doc) {
          let deptName = "";
          if (doc.department_id) {
            const { data: dept } = await supabase
              .from("departments")
              .select("name")
              .eq("id", doc.department_id)
              .maybeSingle();
            deptName = dept?.name || "";
          }
          setUpcomingAppt({ ...token, doctorName: doc.full_name, deptName });
        }
      } else {
        setUpcomingAppt(token);
      }
    }

    // Active admission
    const { data: admissions } = await supabase
      .from("admissions")
      .select("id, admitted_at, admitting_doctor_id, ward_id, bed_id")
      .eq("patient_id", pid)
      .eq("hospital_id", hid)
      .eq("status", "active")
      .limit(1);

    if (admissions?.[0]) {
      const adm = admissions[0];
      const [wardRes, bedRes, docRes] = await Promise.all([
        supabase.from("wards").select("name").eq("id", adm.ward_id).maybeSingle(),
        supabase.from("beds").select("bed_number").eq("id", adm.bed_id).maybeSingle(),
        supabase.from("users").select("full_name").eq("id", adm.admitting_doctor_id).maybeSingle(),
      ]);
      const daysAgo = Math.floor((Date.now() - new Date(adm.admitted_at!).getTime()) / 86400000);
      setActiveAdmission({
        ...adm,
        wardName: wardRes.data?.name,
        bedNumber: bedRes.data?.bed_number,
        doctorName: docRes.data?.full_name,
        daysAgo,
      });
    }

    // Counts
    const [apptRes, labRes, billRes, rxRes] = await Promise.all([
      supabase.from("opd_tokens").select("id", { count: "exact", head: true })
        .eq("patient_id", pid).eq("hospital_id", hid).gte("visit_date", today),
      supabase.from("lab_orders").select("id", { count: "exact", head: true })
        .eq("patient_id", pid).eq("hospital_id", hid).eq("status", "completed"),
      supabase.from("bills").select("balance_due").eq("patient_id", pid).eq("hospital_id", hid).gt("balance_due", 0),
      supabase.from("prescriptions").select("id", { count: "exact", head: true })
        .eq("patient_id", pid).eq("hospital_id", hid),
    ]);

    const totalDue = (billRes.data || []).reduce((s: number, b: any) => s + (b.balance_due || 0), 0);
    setCounts({
      appointments: apptRes.count || 0,
      reports: labRes.count || 0,
      billsDue: totalDue,
      prescriptions: rxRes.count || 0,
    });

    // Recent activity (combine last items from multiple tables)
    const activities: any[] = [];

    const { data: recentLabs } = await supabase
      .from("lab_orders").select("id, order_date, status, created_at")
      .eq("patient_id", pid).eq("hospital_id", hid)
      .order("created_at", { ascending: false }).limit(2);
    (recentLabs || []).forEach((l) => activities.push({
      type: "lab", icon: "🔬",
      text: `Lab report ${l.status === "completed" ? "ready" : "ordered"}`,
      date: l.created_at,
    }));

    const { data: recentBills } = await supabase
      .from("bills").select("id, bill_number, total_amount, created_at")
      .eq("patient_id", pid).eq("hospital_id", hid)
      .order("created_at", { ascending: false }).limit(2);
    (recentBills || []).forEach((b) => activities.push({
      type: "bill", icon: "🧾",
      text: `Bill generated — ₹${(b.total_amount || 0).toLocaleString("en-IN")}`,
      date: b.created_at,
    }));

    const { data: recentRx } = await supabase
      .from("prescriptions").select("id, drugs, created_at")
      .eq("patient_id", pid).eq("hospital_id", hid)
      .order("created_at", { ascending: false }).limit(2);
    (recentRx || []).forEach((r) => {
      const drugCount = Array.isArray(r.drugs) ? r.drugs.length : 0;
      activities.push({
        type: "rx", icon: "💊",
        text: `Prescription issued — ${drugCount} medications`,
        date: r.created_at,
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivity(activities.slice(0, 5));
  };

  const firstName = session.fullName.split(" ")[0];

  const quickActions = [
    { icon: <Calendar size={28} color="#0E7B7B" />, label: "Book Appointment", path: "/portal/appointments", badge: counts.appointments ? `${counts.appointments}` : null },
    { icon: <FlaskConical size={28} color="#0E7B7B" />, label: "My Reports", path: "/portal/reports", badge: counts.reports ? `${counts.reports}` : null },
    { icon: <Receipt size={28} color="#0E7B7B" />, label: "Pay Bills", path: "/portal/bills", badge: counts.billsDue ? `₹${counts.billsDue.toLocaleString("en-IN")}` : null },
    { icon: <Pill size={28} color="#0E7B7B" />, label: "Prescriptions", path: "/portal/prescriptions", badge: counts.prescriptions ? `${counts.prescriptions}` : null },
  ];

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
    catch { return ""; }
  };

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Greeting */}
      <div className="rounded-xl p-4 text-white" style={{ background: "#0E7B7B" }}>
        <p className="text-lg font-bold">{getGreeting()}, {firstName}! 👋</p>
        <p className="text-xs mt-0.5 opacity-80">UHID: {session.uhid}</p>
        {session.bloodGroup && (
          <span
            className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            🩸 {session.bloodGroup}
          </span>
        )}
      </div>

      {/* Upcoming Appointment */}
      {upcomingAppt && (
        <div
          className="bg-white rounded-xl p-3.5"
          style={{ border: "1px solid #E2E8F0", borderLeft: "3px solid #0E7B7B" }}
        >
          <p className="text-[11px] font-bold uppercase" style={{ color: "#0E7B7B" }}>
            📅 Upcoming Appointment
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: "#0F172A" }}>
            {upcomingAppt.doctorName ? `Dr. ${upcomingAppt.doctorName}` : `Token #${upcomingAppt.token_number}`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            {upcomingAppt.deptName && `${upcomingAppt.deptName} · `}
            {new Date(upcomingAppt.visit_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
      )}

      {/* Active Admission */}
      {activeAdmission && (
        <div
          className="rounded-xl p-3.5"
          style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderLeft: "3px solid #F59E0B" }}
        >
          <p className="text-[11px] font-bold uppercase" style={{ color: "#D97706" }}>
            🛏️ Currently Admitted
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: "#0F172A" }}>
            {activeAdmission.wardName} · Bed {activeAdmission.bedNumber}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Admitted: {activeAdmission.daysAgo} days ago · Dr. {activeAdmission.doctorName}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {quickActions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="relative bg-white rounded-xl p-4 text-center active:scale-[0.97] transition-transform"
            style={{ border: "1px solid #E2E8F0" }}
          >
            <div className="flex justify-center">{action.icon}</div>
            <p className="text-xs font-bold mt-2" style={{ color: "#374151" }}>{action.label}</p>
            {action.badge && (
              <span
                className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold"
                style={{ background: "#EF4444" }}
              >
                {action.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <p className="text-[13px] font-bold mb-2" style={{ color: "#0F172A" }}>Recent Activity</p>
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
            {recentActivity.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid #F1F5F9" : "none" }}
              >
                <span className="text-lg">{event.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "#0F172A" }}>{event.text}</p>
                  <p className="text-[10px]" style={{ color: "#94A3B8" }}>{formatDate(event.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalDashboard;
