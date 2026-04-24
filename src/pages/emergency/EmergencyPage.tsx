import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import EmergencyHeader from "@/components/emergency/EmergencyHeader";
import TriageBoard from "@/components/emergency/TriageBoard";
import EmergencyWorkspace from "@/components/emergency/EmergencyWorkspace";
import EmergencyRegistrationModal from "@/components/emergency/EmergencyRegistrationModal";
import { useHospitalId } from "@/hooks/useHospitalId";

export interface EDVisit {
  id: string;
  patient_id: string;
  patient_name: string;
  triage_category: string;
  chief_complaint: string | null;
  arrival_time: string;
  mlc: boolean;
  disposition: string;
  doctor_id: string | null;
  vitals_snapshot: Record<string, any>;
  ample_history: Record<string, any>;
  working_diagnosis: string | null;
  gcs_score: number | null;
  mlc_details: Record<string, any>;
  is_active: boolean;
  minutes_ago: number;
}

const EmergencyPage: React.FC = () => {
  const { hospitalId, loading: hospitalLoading } = useHospitalId();
  const [userId, setUserId] = useState<string | null>(null);
  const [visits, setVisits] = useState<EDVisit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Capture auth user id once for downstream actions
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const fetchData = useCallback(async () => {
    if (!hospitalId) {
      if (!hospitalLoading) setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("ed_visits")
      .select("*, patient:patients(full_name)")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("arrival_time", { ascending: false });

    if (error) { console.error("ED visits fetch error:", error.message); setLoading(false); return; }

    const mapped: EDVisit[] = (data || []).map((v: any) => ({
      id: v.id,
      patient_id: v.patient_id,
      patient_name: v.patient?.full_name || "Unknown",
      triage_category: v.triage_category,
      chief_complaint: v.chief_complaint,
      arrival_time: v.arrival_time,
      mlc: v.mlc || false,
      disposition: v.disposition || "awaiting",
      doctor_id: v.doctor_id,
      vitals_snapshot: v.vitals_snapshot || {},
      ample_history: v.ample_history || {},
      working_diagnosis: v.working_diagnosis,
      gcs_score: v.gcs_score,
      mlc_details: v.mlc_details || {},
      is_active: v.is_active,
      minutes_ago: Math.max(0, Math.round((Date.now() - new Date(v.arrival_time).getTime()) / 60000)),
    }));

    setVisits(mapped);
    setLoading(false);
  }, [hospitalId, hospitalLoading]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime — stable channel, only re-subscribes on hospitalId change
  const fetchDataRef = useRef(fetchData);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
  useEffect(() => {
    if (!hospitalId) return;
    const debouncedFetch = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => fetchDataRef.current(), 800);
    };
    const ch = supabase.channel(`ed-realtime-${hospitalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ed_visits", filter: `hospital_id=eq.${hospitalId}` }, debouncedFetch)
      .subscribe();
    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(ch);
    };
  }, [hospitalId]);

  // Refresh minutes_ago every minute
  useEffect(() => {
    const iv = setInterval(() => {
      setVisits(prev => prev.map(v => ({
        ...v,
        minutes_ago: Math.max(0, Math.round((Date.now() - new Date(v.arrival_time).getTime()) / 60000)),
      })));
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const selectedVisit = visits.find(v => v.id === selectedId) || null;

  const handleCodeBlue = async () => {
    if (!hospitalId) return;
    await supabase.from("clinical_alerts").insert({
      hospital_id: hospitalId,
      alert_type: "code_blue",
      severity: "critical",
      alert_message: "CODE BLUE declared in Emergency Department",
      is_acknowledged: false,
    });
    toast({ title: "🔴 CODE BLUE ALERT SENT", description: "All staff have been notified" });
  };

  const handleTriageChange = async (visitId: string, newCategory: string) => {
    await supabase.from("ed_visits").update({ triage_category: newCategory }).eq("id", visitId);
    fetchData();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0F172A" }}>
      <EmergencyHeader onCodeBlue={handleCodeBlue} />

      {/* ROW 1: Triage Board */}
      <div className="flex-shrink-0" style={{ height: "42%" }}>
        <TriageBoard
          visits={visits}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRegister={() => setShowRegModal(true)}
          onTriageChange={handleTriageChange}
          loading={loading}
        />
      </div>

      {/* ROW 2: Patient Workspace */}
      <div className="flex-1 min-h-0">
        <EmergencyWorkspace
          visit={selectedVisit}
          hospitalId={hospitalId}
          userId={userId}
          onRefresh={fetchData}
        />
      </div>

      <EmergencyRegistrationModal
        open={showRegModal}
        onClose={() => setShowRegModal(false)}
        hospitalId={hospitalId}
        onRegistered={fetchData}
      />
    </div>
  );
};

export default EmergencyPage;
