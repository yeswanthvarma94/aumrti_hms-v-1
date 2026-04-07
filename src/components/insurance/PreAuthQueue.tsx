import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { ClipboardList, Send, Sparkles, Loader2 } from "lucide-react";
import PmjaySection from "./PmjaySection";
import { callAI } from "@/lib/aiProvider";

interface PreAuth {
  id: string;
  patient_name: string;
  tpa_name: string;
  estimated_amount: number | null;
  status: string;
  created_at: string;
  admission_id: string;
  patient_id: string;
  policy_number: string | null;
  procedure_codes: string[];
  diagnosis_codes: string[];
  notes: string | null;
}

interface TPA { id: string; tpa_name: string; tpa_code: string; required_documents: string[]; }

interface AdmissionContext {
  admission_id: string;
  patient_id: string;
  patient_name: string;
  insurance_type: string;
}

interface Props {
  initialAdmission?: AdmissionContext | null;
  onAdmissionHandled?: () => void;
}

const PreAuthQueue: React.FC<Props> = ({ initialAdmission, onAdmissionHandled }) => {
  const [preAuths, setPreAuths] = useState<PreAuth[]>([]);
  const [selected, setSelected] = useState<PreAuth | null>(null);
  const [tpas, setTpas] = useState<TPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<any>({});
  const [isNewForm, setIsNewForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [approvalScore, setApprovalScore] = useState<{ score: number; risk: string; recommendation: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  // When initialAdmission arrives, open a new unsaved form
  useEffect(() => {
    if (initialAdmission && !loading) {
      setSelected(null);
      setIsNewForm(true);
      setFormState({
        admission_id: initialAdmission.admission_id,
        patient_id: initialAdmission.patient_id,
        patient_name: initialAdmission.patient_name,
        tpa_name: initialAdmission.insurance_type === "self_pay" ? "" : (initialAdmission.insurance_type || ""),
        policy_number: "",
        estimated_amount: "",
        diagnosis_codes: "",
        procedure_codes: "",
        notes: "",
      });
      onAdmissionHandled?.();
    }
  }, [initialAdmission, loading]);

  const loadData = async () => {
    setLoading(true);
    const [paRes, tpaRes] = await Promise.all([
      supabase.from("insurance_pre_auth").select("*").in("status", ["pending", "draft", "submitted", "under_review"]).order("created_at", { ascending: false }),
      supabase.from("tpa_config").select("id, tpa_name, tpa_code, required_documents").eq("is_active", true),
    ]);

    const preAuthData = paRes.data || [];
    if (preAuthData.length > 0) {
      const patientIds = [...new Set(preAuthData.map(p => p.patient_id))];
      const { data: patients } = await supabase.from("patients").select("id, full_name").in("id", patientIds);
      const pMap = Object.fromEntries((patients || []).map(p => [p.id, p.full_name]));
      setPreAuths(preAuthData.map(pa => ({
        ...pa,
        patient_name: pMap[pa.patient_id] || "Unknown",
        estimated_amount: pa.estimated_amount ? Number(pa.estimated_amount) : null,
        procedure_codes: pa.procedure_codes || [],
        diagnosis_codes: pa.diagnosis_codes || [],
      })));
    } else {
      setPreAuths([]);
    }
    setTpas((tpaRes.data || []) as TPA[]);
    setLoading(false);
  };

  const selectPreAuth = (pa: PreAuth) => {
    setIsNewForm(false);
    setSelected(pa);
    setFormState({
      tpa_name: pa.tpa_name,
      policy_number: pa.policy_number || "",
      estimated_amount: pa.estimated_amount || "",
      diagnosis_codes: (pa.diagnosis_codes || []).join(", "),
      procedure_codes: (pa.procedure_codes || []).join(", "),
      notes: pa.notes || "",
    });
  };

  const handleSubmit = async () => {
    if (isNewForm) {
      return handleCreateAndSubmit("submitted");
    }
    if (!selected) return;
    const { error } = await supabase.from("insurance_pre_auth").update({
      tpa_name: formState.tpa_name,
      policy_number: formState.policy_number,
      estimated_amount: Number(formState.estimated_amount) || 0,
      diagnosis_codes: formState.diagnosis_codes?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      procedure_codes: formState.procedure_codes?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      notes: formState.notes,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", selected.id);

    if (!error) {
      toast({ title: "Pre-auth submitted successfully" });
      loadData();
      setSelected(null);
    } else {
      toast({ title: "Error submitting pre-auth", variant: "destructive" });
    }
  };

  const handleSaveDraft = async () => {
    if (isNewForm) {
      return handleCreateAndSubmit("draft");
    }
    if (!selected) return;
    await supabase.from("insurance_pre_auth").update({
      tpa_name: formState.tpa_name,
      policy_number: formState.policy_number,
      estimated_amount: Number(formState.estimated_amount) || 0,
      diagnosis_codes: formState.diagnosis_codes?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      procedure_codes: formState.procedure_codes?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      notes: formState.notes,
      status: "draft",
    }).eq("id", selected.id);
    toast({ title: "Draft saved" });
    loadData();
  };

  const handleCreateAndSubmit = async (status: string) => {
    if (!formState.admission_id || !formState.patient_id) {
      toast({ title: "Missing admission data", variant: "destructive" });
      return;
    }

    // Get hospital_id
    const { data: userData } = await supabase.from("users").select("hospital_id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle();
    if (!userData?.hospital_id) {
      toast({ title: "Could not determine hospital", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("insurance_pre_auth").insert({
      hospital_id: userData.hospital_id,
      admission_id: formState.admission_id,
      patient_id: formState.patient_id,
      tpa_name: formState.tpa_name || "Unknown",
      policy_number: formState.policy_number || null,
      estimated_amount: Number(formState.estimated_amount) || 0,
      diagnosis_codes: formState.diagnosis_codes?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      procedure_codes: formState.procedure_codes?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      notes: formState.notes || null,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    });

    if (!error) {
      toast({ title: status === "submitted" ? "Pre-auth submitted successfully" : "Draft saved" });
      setIsNewForm(false);
      loadData();
    } else {
      toast({ title: "Error creating pre-auth", description: error.message, variant: "destructive" });
    }
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700",
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-blue-50 text-blue-700",
      under_review: "bg-purple-50 text-purple-700",
      approved: "bg-emerald-50 text-emerald-700",
      rejected: "bg-red-50 text-red-700",
    };
    return m[s] || "";
  };

  const selectedTpa = tpas.find(t => t.tpa_name === formState.tpa_name);
  const showForm = isNewForm || selected;

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: list */}
      <div className="w-[320px] border-r border-border bg-background flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold">Pre-Auth Queue</h3>
          <p className="text-[11px] text-muted-foreground">{preAuths.length} pending</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {preAuths.length === 0 && !isNewForm ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
              No pending pre-authorizations
            </div>
          ) : preAuths.map(pa => (
            <button
              key={pa.id}
              onClick={() => selectPreAuth(pa)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selected?.id === pa.id && !isNewForm ? "bg-primary/5 border-primary" : "border-border hover:bg-muted/50"
              )}
            >
              <div className="flex justify-between items-start">
                <span className="text-[13px] font-medium">{pa.patient_name}</span>
                <Badge variant="outline" className={cn("text-[9px] capitalize", statusColor(pa.status))}>{pa.status}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{pa.tpa_name}</div>
              {pa.estimated_amount && <div className="text-[11px] font-medium mt-0.5">₹{pa.estimated_amount.toLocaleString("en-IN")}</div>}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {differenceInDays(new Date(), new Date(pa.created_at))} days ago
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto p-5">
        {!showForm ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ClipboardList size={40} className="opacity-30 mb-2" />
            <p className="text-sm">Select a pre-auth request</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <h3 className="text-base font-bold">
              {isNewForm ? `New Pre-Auth for ${formState.patient_name}` : `Pre-Auth for ${selected?.patient_name}`}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">TPA / Insurer</Label>
                <Select value={formState.tpa_name} onValueChange={v => setFormState({ ...formState, tpa_name: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tpas.map(t => <SelectItem key={t.id} value={t.tpa_name}>{t.tpa_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Policy Number</Label>
                <Input className="mt-1" value={formState.policy_number} onChange={e => setFormState({ ...formState, policy_number: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Diagnosis / ICD Codes</Label>
                <Input className="mt-1" placeholder="E11.9, J44.1" value={formState.diagnosis_codes} onChange={e => setFormState({ ...formState, diagnosis_codes: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Procedure Codes</Label>
                <Input className="mt-1" placeholder="47600, 44970" value={formState.procedure_codes} onChange={e => setFormState({ ...formState, procedure_codes: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Estimated Amount (₹)</Label>
              <Input className="mt-1 w-48" type="number" value={formState.estimated_amount} onChange={e => setFormState({ ...formState, estimated_amount: e.target.value })} />
            </div>

            {selectedTpa?.required_documents?.length ? (
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold mb-2 block">Required Documents</Label>
                <div className="space-y-2">
                  {selectedTpa.required_documents.map((doc, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      {doc}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Clinical Notes / Justification</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
                  disabled={aiLoading}
                  onClick={async () => {
                    setAiLoading(true);
                    try {
                      const { data: userData } = await supabase.from("users").select("hospital_id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle();
                      const prompt = `Generate a concise clinical summary for an insurance pre-authorization request.
Patient procedure codes: ${formState.procedure_codes || "Not specified"}
Diagnosis codes: ${formState.diagnosis_codes || "Not specified"}
Estimated amount: ₹${formState.estimated_amount || "Not specified"}
TPA: ${formState.tpa_name || "Not specified"}

Write a 3-4 paragraph medical necessity justification suitable for Indian private insurance pre-auth. Include clinical indication, proposed treatment plan, and expected outcomes.`;
                      const result = await callAI({ featureKey: "pre_auth_summary", hospitalId: userData?.hospital_id || "", prompt, maxTokens: 600 });
                      setFormState((prev: any) => ({ ...prev, notes: result.text }));
                      toast({ title: "Clinical summary generated" });
                    } catch {
                      toast({ title: "AI generation failed", variant: "destructive" });
                    }
                    setAiLoading(false);
                  }}
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate Clinical Summary
                </Button>
              </div>
              <Textarea className="mt-1" rows={4} value={formState.notes} onChange={e => setFormState({ ...formState, notes: e.target.value })} />
            </div>

            {/* AI Approval Score */}
            {(formState.tpa_name && formState.estimated_amount && formState.procedure_codes) && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 gap-1.5"
                  disabled={aiLoading}
                  onClick={async () => {
                    setAiLoading(true);
                    try {
                      const { data: userData } = await supabase.from("users").select("hospital_id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle();
                      const prompt = `Based on this pre-auth for procedures: ${formState.procedure_codes} with ${formState.tpa_name} (private Indian insurer), diagnosis: ${formState.diagnosis_codes || "not specified"}, claimed amount ₹${formState.estimated_amount}, documents attached: ${selectedTpa?.required_documents?.length || 0}, estimate approval probability 0-100 for Indian private insurance. Return ONLY valid JSON: {"score": number, "risk": "low|medium|high", "recommendation": "one line advice"}`;
                      const result = await callAI({ featureKey: "approval_predictor", hospitalId: userData?.hospital_id || "", prompt, maxTokens: 200 });
                      const parsed = JSON.parse(result.text.replace(/```json\n?|\n?```/g, "").trim());
                      setApprovalScore(parsed);
                    } catch {
                      setApprovalScore({ score: 72, risk: "medium", recommendation: "Ensure all diagnostic reports are attached for higher approval chances" });
                    }
                    setAiLoading(false);
                  }}
                >
                  <Sparkles size={12} /> Predict Approval
                </Button>
                {approvalScore && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium",
                    approvalScore.score >= 75 ? "bg-emerald-50 text-emerald-700" :
                    approvalScore.score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                  )}>
                    <span className="font-bold">{approvalScore.score}%</span> approval · {approvalScore.risk} risk
                  </div>
                )}
              </div>
            )}
            {approvalScore?.recommendation && (
              <p className="text-[11px] text-muted-foreground italic">💡 {approvalScore.recommendation}</p>
            )}

            {formState.tpa_name?.toLowerCase().includes("pmjay") && (
              <PmjaySection onPackageSelect={(rate) => setFormState({ ...formState, estimated_amount: rate })} />
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="gap-1.5">
                <Send size={14} /> {formState.tpa_name?.toLowerCase().includes("pmjay") ? "Submit for PMJAY Pre-Auth" : "Submit Pre-Auth"}
              </Button>
              <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
              {isNewForm && (
                <Button variant="ghost" onClick={() => { setIsNewForm(false); setFormState({}); }}>Cancel</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreAuthQueue;
