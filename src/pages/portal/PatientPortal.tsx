import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, LogOut, Calendar, Receipt, FlaskConical, Pill, ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────

interface PatientSession {
  patientId: string;
  hospitalId: string;
  fullName: string;
  uhid: string;
  phone: string;
  hospitalName: string;
  hospitalLogo: string | null;
  hospitalColor: string;
}

type PortalTab = "home" | "appointments" | "bills" | "lab" | "prescriptions";

// ── OTP Login Screen ──────────────────────────────────────────

const OTPLogin: React.FC<{ onLogin: (s: PatientSession) => void }> = ({ onLogin }) => {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true);
    setError("");

    // Find patient by phone
    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, uhid, phone, hospital_id")
      .eq("phone", clean)
      .limit(1)
      .maybeSingle();

    if (!patient) {
      setError("No patient record found for this phone number. Please contact the hospital.");
      setLoading(false);
      return;
    }

    // In demo mode, we just move to OTP entry
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp !== "123456") { setError("Invalid OTP. Demo OTP is 123456"); return; }
    setLoading(true);
    setError("");

    const clean = phone.replace(/\D/g, "");
    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, uhid, phone, hospital_id")
      .eq("phone", clean)
      .limit(1)
      .maybeSingle();

    if (!patient) { setError("Patient not found"); setLoading(false); return; }

    // Fetch hospital branding
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("name, logo_url, primary_color")
      .eq("id", patient.hospital_id)
      .maybeSingle();

    onLogin({
      patientId: patient.id,
      hospitalId: patient.hospital_id,
      fullName: patient.full_name,
      uhid: patient.uhid,
      phone: patient.phone || clean,
      hospitalName: hospital?.name || "Hospital",
      hospitalLogo: hospital?.logo_url || null,
      hospitalColor: hospital?.primary_color || "hsl(220, 54%, 23%)",
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-10 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">Patient Portal</h1>
        <p className="text-sm opacity-75 mt-1">Access your medical records</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <h2 className="text-lg font-bold text-foreground mb-1">
          {otpSent ? "Enter OTP" : "Login with Phone"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {otpSent
            ? "Enter the 6-digit OTP sent to your phone"
            : "Enter your registered phone number"}
        </p>

        {!otpSent ? (
          <div className="space-y-4">
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                placeholder="Enter 10-digit mobile number"
                maxLength={12}
                className="w-full h-12 pl-11 pr-4 text-base bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <button
              onClick={handleSendOTP}
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              {loading ? "Checking..." : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
            />
            <p className="text-xs text-muted-foreground text-center">
              Demo mode — use OTP: <span className="font-mono font-bold text-foreground">123456</span>
            </p>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
            >
              ← Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Portal Home ───────────────────────────────────────────────

const PortalHome: React.FC<{ session: PatientSession; onNavigate: (t: PortalTab) => void; onLogout: () => void }> = ({ session, onNavigate, onLogout }) => {
  const menuItems: { tab: PortalTab; icon: React.ReactNode; label: string; desc: string }[] = [
    { tab: "appointments", icon: <Calendar size={22} />, label: "Appointments", desc: "View upcoming & past visits" },
    { tab: "bills", icon: <Receipt size={22} />, label: "Bills & Payments", desc: "View bills, download receipts" },
    { tab: "lab", icon: <FlaskConical size={22} />, label: "Lab Reports", desc: "View test results" },
    { tab: "prescriptions", icon: <Pill size={22} />, label: "Prescriptions", desc: "View medications prescribed" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm opacity-75">{session.hospitalName}</p>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs opacity-70 hover:opacity-100">
            <LogOut size={14} /> Logout
          </button>
        </div>
        <h1 className="text-xl font-bold">Hello, {session.fullName.split(" ")[0]} 👋</h1>
        <p className="text-sm opacity-70 mt-0.5 font-mono">UHID: {session.uhid}</p>
      </div>

      {/* Menu */}
      <div className="px-4 -mt-3">
        <div className="bg-card rounded-2xl shadow-sm border border-border divide-y divide-border overflow-hidden">
          {menuItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-muted/50 transition-colors active:bg-muted"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Appointments Tab ──────────────────────────────────────────

const AppointmentsSection: React.FC<{ session: PatientSession }> = ({ session }) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opd_tokens")
        .select("id, token_number, visit_date, status, priority, doctor_id, department_id")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("visit_date", { ascending: false })
        .limit(20);
      setTokens(data || []);
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-3">
      {tokens.length === 0 ? (
        <EmptyState icon={<Calendar size={32} />} message="No appointments found" />
      ) : tokens.map((t) => (
        <div key={t.id} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground">Token #{t.token_number}</span>
            <StatusBadge status={t.status} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {format(new Date(t.visit_date), "dd MMM yyyy")}
          </p>
          {t.priority !== "normal" && (
            <span className="text-xs text-accent font-medium">⚡ {t.priority}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Bills Tab ─────────────────────────────────────────────────

const BillsSection: React.FC<{ session: PatientSession }> = ({ session }) => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bills")
        .select("id, bill_number, bill_date, total_amount, paid_amount, balance_due, payment_status, bill_type")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("bill_date", { ascending: false })
        .limit(20);
      setBills(data || []);
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-3">
      {bills.length === 0 ? (
        <EmptyState icon={<Receipt size={32} />} message="No bills found" />
      ) : bills.map((b) => (
        <div key={b.id} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-muted-foreground">#{b.bill_number}</span>
            <StatusBadge status={b.payment_status} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            ₹{(b.total_amount || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {format(new Date(b.bill_date), "dd MMM yyyy")}
            </span>
            {(b.balance_due || 0) > 0 && (
              <span className="text-xs font-semibold text-destructive">
                Due: ₹{b.balance_due.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Lab Reports Tab ───────────────────────────────────────────

const LabSection: React.FC<{ session: PatientSession }> = ({ session }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lab_orders")
        .select("id, order_date, status, priority, clinical_notes")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("order_date", { ascending: false })
        .limit(20);
      setOrders(data || []);
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-3">
      {orders.length === 0 ? (
        <EmptyState icon={<FlaskConical size={32} />} message="No lab reports found" />
      ) : orders.map((o) => (
        <div key={o.id} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-1">
            <StatusBadge status={o.status} />
            {o.priority === "urgent" && <span className="text-xs text-destructive font-bold">URGENT</span>}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {format(new Date(o.order_date), "dd MMM yyyy")}
          </p>
          {o.clinical_notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.clinical_notes}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Prescriptions Tab ─────────────────────────────────────────

const PrescriptionsSection: React.FC<{ session: PatientSession }> = ({ session }) => {
  const [rxList, setRxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select("id, prescription_date, drugs, advice_notes, review_date")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("prescription_date", { ascending: false })
        .limit(20);
      setRxList(data || []);
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-3">
      {rxList.length === 0 ? (
        <EmptyState icon={<Pill size={32} />} message="No prescriptions found" />
      ) : rxList.map((rx) => {
        const drugs = Array.isArray(rx.drugs) ? rx.drugs : [];
        return (
          <div key={rx.id} className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-foreground">
              {rx.prescription_date ? format(new Date(rx.prescription_date), "dd MMM yyyy") : "—"}
            </p>
            {drugs.length > 0 && (
              <div className="mt-2 space-y-1">
                {drugs.slice(0, 5).map((d: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    💊 {d.drug_name || d.name || "Medication"} {d.dose ? `— ${d.dose}` : ""} {d.frequency ? `(${d.frequency})` : ""}
                  </p>
                ))}
                {drugs.length > 5 && <p className="text-xs text-muted-foreground">+{drugs.length - 5} more</p>}
              </div>
            )}
            {rx.advice_notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">📝 {rx.advice_notes}</p>
            )}
            {rx.review_date && (
              <p className="text-xs text-primary font-medium mt-2">
                📅 Review: {format(new Date(rx.review_date), "dd MMM yyyy")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Shared Components ─────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase() || "";
  const colorMap: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    validated: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    waiting: "bg-amber-100 text-amber-700",
    partial: "bg-orange-100 text-orange-700",
    unpaid: "bg-red-100 text-red-700",
    cancelled: "bg-muted text-muted-foreground",
  };
  const cls = colorMap[s] || "bg-muted text-muted-foreground";
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cls}`}>{status}</span>;
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
    {icon}
    <p className="text-sm mt-3">{message}</p>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-2" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    ))}
  </div>
);

// ── Main Portal ───────────────────────────────────────────────

const TAB_CONFIG: Record<Exclude<PortalTab, "home">, { label: string; Component: React.FC<{ session: PatientSession }> }> = {
  appointments: { label: "Appointments", Component: AppointmentsSection },
  bills: { label: "Bills & Payments", Component: BillsSection },
  lab: { label: "Lab Reports", Component: LabSection },
  prescriptions: { label: "Prescriptions", Component: PrescriptionsSection },
};

const PatientPortal: React.FC = () => {
  const [session, setSession] = useState<PatientSession | null>(null);
  const [tab, setTab] = useState<PortalTab>("home");

  const handleLogout = useCallback(() => {
    setSession(null);
    setTab("home");
  }, []);

  if (!session) return <OTPLogin onLogin={(s) => { setSession(s); setTab("home"); }} />;

  if (tab === "home") return <PortalHome session={session} onNavigate={setTab} onLogout={handleLogout} />;

  const config = TAB_CONFIG[tab];
  const { Component } = config;

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-page header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => setTab("home")} className="p-1 hover:bg-white/10 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-bold">{config.label}</h2>
      </div>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <Component session={session} />
      </div>
    </div>
  );
};

export default PatientPortal;
