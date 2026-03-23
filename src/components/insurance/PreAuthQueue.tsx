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
import { differenceInDays, format } from "date-fns";
import { ClipboardList, Send, Sparkles } from "lucide-react";
import PmjaySection from "./PmjaySection";

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

const PreAuthQueue: React.FC = () => {
  const [preAuths, setPreAuths] = useState<PreAuth[]>([]);
  const [selected, setSelected] = useState<PreAuth | null>(null);
  const [tpas, setTpas] = useState<TPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

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
          {preAuths.length === 0 ? (
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
                selected?.id === pa.id ? "bg-primary/5 border-primary" : "border-border hover:bg-muted/50"
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
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ClipboardList size={40} className="opacity-30 mb-2" />
            <p className="text-sm">Select a pre-auth request</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <h3 className="text-base font-bold">Pre-Auth for {selected.patient_name}</h3>

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

            {/* Document checklist */}
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
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Notes</Label>
              <Textarea className="mt-1" rows={3} value={formState.notes} onChange={e => setFormState({ ...formState, notes: e.target.value })} />
            </div>

            {/* PMJAY Section */}
            {formState.tpa_name?.toLowerCase().includes("pmjay") && (
              <PmjaySection onPackageSelect={(rate) => setFormState({ ...formState, estimated_amount: rate })} />
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="gap-1.5">
                <Send size={14} /> {formState.tpa_name?.toLowerCase().includes("pmjay") ? "Submit for PMJAY Pre-Auth" : "Submit Pre-Auth"}
              </Button>
              <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreAuthQueue;
