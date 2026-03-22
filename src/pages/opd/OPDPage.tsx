import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  patient?: { full_name: string; phone: string | null; uhid: string; gender: string | null; dob: string | null };
  doctor?: { full_name: string } | null;
  department?: { name: string } | null;
}

const OPDPage: React.FC = () => {
  const [tokens, setTokens] = useState<OpdToken[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    const { data: userData } = await supabase.from("users").select("hospital_id").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").single();
    if (!userData) return;
    setHospitalId(userData.hospital_id);

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("opd_tokens")
      .select("*, patient:patients(full_name, phone, uhid, gender, dob), doctor:users!opd_tokens_doctor_id_fkey(full_name), department:departments(name)")
      .eq("hospital_id", userData.hospital_id)
      .eq("visit_date", today)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tokens:", error);
      return;
    }
    setTokens((data as unknown as OpdToken[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Realtime subscription
  useEffect(() => {
    if (!hospitalId) return;
    const today = new Date().toISOString().split("T")[0];

    const channel = supabase
      .channel("opd-tokens-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opd_tokens",
          filter: `hospital_id=eq.${hospitalId}`,
        },
        () => {
          fetchTokens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospitalId, fetchTokens]);

  const selectedToken = tokens.find((t) => t.id === selectedTokenId) || null;

  return (
    <div className="flex flex-row h-full overflow-hidden">
      <TokenQueue
        tokens={tokens}
        selectedTokenId={selectedTokenId}
        onSelectToken={setSelectedTokenId}
        hospitalId={hospitalId}
        loading={loading}
        onTokenCreated={fetchTokens}
      />
      <ConsultationWorkspace token={selectedToken} />
      <PatientSummary token={selectedToken} />
    </div>
  );
};

export default OPDPage;
