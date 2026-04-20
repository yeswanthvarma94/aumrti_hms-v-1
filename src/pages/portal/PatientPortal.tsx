import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import PortalLogin, { PortalSession } from "./PortalLogin";
import PortalLayout from "./PortalLayout";
import PortalDashboard from "./PortalDashboard";
import PortalAppointments from "./PortalAppointments";
import PortalReports from "./PortalReports";
import PortalBills from "./PortalBills";
import PortalPrescriptions from "./PortalPrescriptions";
import PortalFeedback from "./PortalFeedback";
import PortalTimeline from "./PortalTimeline";
import { supabase } from "@/integrations/supabase/client";

const PORTAL_CACHE_KEY = "portal_cache";

const PatientPortal: React.FC = () => {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheDate, setCacheDate] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const hospitalId = searchParams.get("h") || null;

  // Track online/offline
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Try restoring session from localStorage
  useEffect(() => {
    const token = localStorage.getItem("portal_session_token");
    const pid = localStorage.getItem("portal_patient_id");
    if (!token || !pid) { setLoading(false); return; }

    (async () => {
      // If offline, hydrate from cache immediately
      if (!navigator.onLine) {
        try {
          const cached = localStorage.getItem(PORTAL_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.session) {
              setSession(parsed.session);
              setCacheDate(parsed.cachedAt || null);
            }
          }
        } catch { /* ignore */ }
        setLoading(false);
        return;
      }

      try {
        const { data: sess } = await supabase
          .from("patient_portal_sessions")
          .select("patient_id, hospital_id")
          .eq("session_token", token)
          .eq("otp_verified", true)
          .maybeSingle();

        if (!sess) {
          localStorage.removeItem("portal_session_token");
          localStorage.removeItem("portal_patient_id");
          setLoading(false);
          return;
        }

        const s = sess as any;
        const { data: patient } = await supabase
          .from("patients")
          .select("full_name, uhid, phone, blood_group")
          .eq("id", s.patient_id)
          .maybeSingle();

        const { data: hospital } = await supabase
          .from("hospitals")
          .select("name, logo_url")
          .eq("id", s.hospital_id)
          .maybeSingle();

        if (patient && hospital) {
          const newSession: PortalSession = {
            patientId: s.patient_id,
            hospitalId: s.hospital_id,
            fullName: patient.full_name,
            uhid: patient.uhid,
            phone: patient.phone || "",
            hospitalName: hospital.name,
            hospitalLogo: hospital.logo_url,
            bloodGroup: patient.blood_group || null,
          };
          setSession(newSession);
          // Cache for offline use
          try {
            localStorage.setItem(
              PORTAL_CACHE_KEY,
              JSON.stringify({ session: newSession, cachedAt: new Date().toISOString() })
            );
          } catch { /* quota — ignore */ }
        }
      } catch {
        // Network failed — fall back to cache
        try {
          const cached = localStorage.getItem(PORTAL_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.session) {
              setSession(parsed.session);
              setCacheDate(parsed.cachedAt || null);
            }
          }
        } catch { /* ignore */ }
      }
      setLoading(false);
    })();
  }, []);


  const handleLogin = useCallback((s: PortalSession) => {
    setSession(s);
    navigate("/portal/dashboard");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("portal_session_token");
    localStorage.removeItem("portal_patient_id");
    localStorage.removeItem(PORTAL_CACHE_KEY);
    setSession(null);
    navigate("/portal/login");
  }, [navigate]);

  const formatCacheDate = (iso: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch { return ""; }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: "#E2E8F0", borderTopColor: "#0E7B7B" }} />
      </div>
    );
  }

  // Not logged in — show login on any portal route
  if (!session) {
    return (
      <Routes>
        <Route path="login" element={<PortalLogin hospitalId={hospitalId} onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to={`/portal/login${hospitalId ? `?h=${hospitalId}` : ""}`} replace />} />
      </Routes>
    );
  }

  // Logged in — wrap in portal layout
  return (
    <PortalLayout
      hospitalName={session.hospitalName}
      hospitalLogo={session.hospitalLogo}
      patientName={session.fullName}
      onLogout={handleLogout}
    >
      {isOffline && cacheDate && (
        <div
          style={{
            background: "#FEF3C7",
            color: "#92400E",
            padding: "8px 16px",
            fontSize: 13,
            textAlign: "center",
            borderBottom: "1px solid #FDE68A",
          }}
        >
          📡 Showing last synced data from {formatCacheDate(cacheDate)}
        </div>
      )}
      <Routes>
        <Route path="dashboard" element={<PortalDashboard session={session} />} />
        <Route path="appointments" element={<PortalAppointments session={session} />} />
        <Route path="reports" element={<PortalReports session={session} />} />
        <Route path="bills" element={<PortalBills session={session} />} />
        <Route path="prescriptions" element={<PortalPrescriptions session={session} />} />
        <Route path="timeline" element={<PortalTimeline session={session} />} />
        <Route path="feedback" element={<PortalFeedback session={session} />} />
        <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
      </Routes>
    </PortalLayout>
  );
};

export default PatientPortal;
