import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_REALTIME } from "@/hooks/queries/staleTimes";
import TokenQueue from "@/components/opd/TokenQueue";
import ConsultationWorkspace from "@/components/opd/ConsultationWorkspace";
import PatientSummary from "@/components/opd/PatientSummary";

export interface OpdToken {
  id: string;
  token_number: string;
  token_prefix: string;
  status: string;
  priority: string;
  visit_date: string;
  called_at: string | null;
  consultation_start_at: string | null;
  consultation_end_at: string | null;
  created_at: string;
  patient_id: string;
  doctor_id: string | null;
  department_id: string | null;
  hospital_id: string;
  patient?: { full_name: string; phone: string | null; uhid: string; gender: string | null; dob: string | null; blood_group: string | null; allergies: string | null; chronic_conditions: string[] | null; insurance_id: string | null; address: string | null };
  doctor?: { full_name: string } | null;
  department?: { name: string } | null;
}

const OPDPage: React.FC = () => {
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const { hospitalId, role: userRole } = useHospitalId();
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Resolve internal users.id once (cached via useHospitalId already returns role+hospital_id;
  // we still need users.id for doctor filtering). One-time fetch, then never re-runs.
  useEffect(() => {
    if (!hospitalId || userId) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!cancelled && data) setUserId(data.id);
    })();
    return () => { cancelled = true; };
  }, [hospitalId, userId]);

  const today = new Date().toISOString().split("T")[0];

  const { data: tokens = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["opd-tokens", hospitalId, today, userRole, userId],
    enabled: !!hospitalId && (userRole !== "doctor" || !!userId),
    staleTime: STALE_REALTIME,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("opd_tokens")
        .select("*, patient:patients(full_name, phone, uhid, gender, dob, blood_group, allergies, chronic_conditions, insurance_id, address), doctor:users!opd_tokens_doctor_id_fkey(full_name), department:departments(name)")
        .eq("hospital_id", hospitalId as string)
        .eq("visit_date", today)
        .order("created_at", { ascending: true });

      if (userRole === "doctor" && userId) {
        query = query.eq("doctor_id", userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching tokens:", error);
        toast({ title: "Failed to load OPD queue", description: "Please try again.", variant: "destructive" });
        throw error;
      }
      return (data as unknown as OpdToken[]) || [];
    },
  });

  const fetchTokens = useCallback(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!hospitalId) return;
    const channel = supabase
      .channel("opd-tokens-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_tokens", filter: `hospital_id=eq.${hospitalId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["opd-tokens", hospitalId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospitalId, queryClient]);

  const selectedToken = tokens.find((t) => t.id === selectedTokenId) || null;

  return (
    <div className="flex flex-row h-full overflow-hidden">
      <TokenQueue tokens={tokens} selectedTokenId={selectedTokenId} onSelectToken={(id) => { setSelectedTokenId(id); setShowPatientDetails(false); }} hospitalId={hospitalId} loading={loading} onTokenCreated={fetchTokens} />
      <ConsultationWorkspace token={selectedToken} hospitalId={hospitalId} userId={userId} onTokenUpdate={fetchTokens} showPatientDetails={showPatientDetails} onTogglePatientDetails={() => setShowPatientDetails((p) => !p)} />
      {showPatientDetails && <PatientSummary token={selectedToken} hospitalId={hospitalId} onClose={() => setShowPatientDetails(false)} />}
    </div>
  );
};

export default OPDPage;
