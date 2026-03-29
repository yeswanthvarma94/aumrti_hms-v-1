import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList, Send, Bot, FileText, CheckCircle2, RefreshCw } from "lucide-react";
import { callAI } from "@/lib/aiProvider";

interface PreAuth {
  id: string;
  patient_id: string;
  admission_id: string | null;
  scheme_id: string;
  beneficiary_id: string;
  package_code: string;
  package_name: string;
  requested_amount: number;
  approved_amount: number | null;
  clinical_summary: string | null;
  justification: string | null;
  ai_approval_score: number | null;
  status: string;
  submission_method: string;
  created_at: string;
  submitted_at: string | null;
  auth_number: string | null;
  rejection_reason: string | null;
}

interface Props {
  showNewForm: boolean;
  onFormClosed: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-purple-50 text-purple-700",
  approved: "bg-emerald-50 text-emerald-700",
  partially_approved: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const REQUIRED_DOCS = [
  "Discharge summary / IP case sheet",
  "Beneficiary card copy",
  "Aadhaar copy",
  "Investigation reports",
  "Pre-operative photos (if surgery)",
];

const PmjayPreAuthTab: React.FC<Props> = ({ showNewForm, onFormClosed }) => {
  const [preAuths, setPreAuths] = useState<PreAuth[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});
  const [schemes, setSchemes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<PreAuth | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [editSummary, setEditSummary] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<boolean[]>(REQUIRED_DOCS.map(() => false));
  const [scoreData, setScoreData] = useState<{ score: number | null; risk: string | null; recommendation: string | null }>({ score: null, risk: null, recommendation: null });
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selected) {
      setEditSummary(selected.clinical_summary || "");
      setScoreData({
        score: selected.ai_approval_score,
        risk: null,
        recommendation: null,
      });
      setCheckedDocs(REQUIRED_DOCS.map(() => false));
    }
  }, [selected?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("pre_auth_requests").select("*").order("created_at", { ascending: false });
    const rows = (data || []) as PreAuth[];
    setPreAuths(rows);

    if (rows.length > 0) {
      const pIds = [...new Set(rows.map(r => r.patient_id))];
      const sIds = [...new Set(rows.map(r => r.scheme_id))];
      const [pRes, sRes] = await Promise.all([
        supabase.from("patients").select("id, full_name").in("id", pIds),
        supabase.from("govt_schemes").select("id, scheme_name").in("id", sIds),
      ]);
      setPatients(Object.fromEntries((pRes.data || []).map(p => [p.id, p.full_name])));
      setSchemes(Object.fromEntries((sRes.data || []).map(s => [s.id, s.scheme_name])));
    }
    setLoading(false);
  };

  const filtered = filter === "all" ? preAuths : preAuths.filter(p => p.status === filter);

  const updateStatus = async (id: string, status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase.from("pre_auth_requests").update({ status, ...extra }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    toast({ title: `Status updated to ${status}` });
    loadData();
    setSelected(null);
  };

  // FEATURE 1: AI Clinical Summary
  const generateClinicalSummary = async (pa: PreAuth) => {
    setAiLoading(true);
    try {
      // Try to fetch admission details if available
      let admissionContext = "";
      if (pa.admission_id) {
        const { data: admission } = await supabase
          .from("admissions")
          .select("*, patients(full_name, dob, gender), wards(ward_name)")
          .eq("id", pa.admission_id)
          .single();
        if (admission) {
          const p = admission.patients as any;
          const w = admission.wards as any;
          const patientAge = p?.dob
            ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 86400000))
            : "N/A";
          admissionContext = `
Patient: ${p?.full_name || "Unknown"}, ${patientAge}yrs, ${p?.gender || "N/A"}
Admission date: ${admission.admitted_at || "N/A"}
Diagnosis: ${admission.admitting_diagnosis || "As per treating doctor"}
Ward: ${w?.ward_name || "N/A"}`;
        }
      }

      if (!admissionContext) {
        admissionContext = `
Patient: ${patients[pa.patient_id] || "Unknown"}
Package: ${pa.package_name} (${pa.package_code})`;
      }

      const response = await callAI({
        featureKey: "appeal_letter",
        hospitalId: "",
        prompt: `Write a formal clinical summary for insurance pre-authorization for an Indian government health scheme.
${admissionContext}
Package: ${pa.package_name} (${pa.package_code})
Amount: ₹${pa.requested_amount}

Write a 3-paragraph clinical summary:
Para 1: Patient presentation and diagnosis
Para 2: Clinical findings and investigations
Para 3: Proposed treatment/procedure and medical necessity

Keep language formal and medical. Max 300 words.
This will be submitted to government authorities.`,
        maxTokens: 400,
      });

      if (response && !response.error) {
        const summaryText = response.text || "";
        setEditSummary(summaryText);
        await supabase.from("pre_auth_requests").update({ clinical_summary: summaryText }).eq("id", pa.id);
        toast({ title: "Clinical summary generated ✓" });
        loadData();
      } else {
        console.warn("AI unavailable:", response?.error);
        toast({ title: "AI unavailable — write summary manually", variant: "destructive" });
      }
    } catch (error) {
      console.error("Clinical summary generation failed:", error);
      toast({ title: "Failed to generate summary", variant: "destructive" });
    }
    setAiLoading(false);
  };

  // FEATURE 2: AI Approval Score
  const calculateApprovalScore = async (pa: PreAuth) => {
    setScoreLoading(true);
    try {
      const docsChecked = checkedDocs.filter(Boolean).length;
      const summaryWords = (editSummary || "").split(/\s+/).filter(Boolean).length;

      const response = await callAI({
        featureKey: "appeal_letter",
        hospitalId: "",
        prompt: `You are an expert in PMJAY/Ayushman Bharat claim approval patterns in Indian government hospitals.

Pre-auth details:
Package: ${pa.package_name} (₹${pa.requested_amount})
Diagnosis: ${pa.justification || pa.clinical_summary?.substring(0, 100) || "Not specified"}
Patient: ${patients[pa.patient_id] || "Unknown"}
Documents uploaded: ${docsChecked} of ${REQUIRED_DOCS.length}
Clinical summary length: ${summaryWords} words

Based on typical PMJAY approval patterns, estimate:
1. Approval probability (0-100)
2. Main approval risk factor (one sentence)
3. One specific recommendation to improve chances

Return ONLY JSON:
{
  "score": 75,
  "risk": "Incomplete documentation — missing investigation reports",
  "recommendation": "Upload CBC and LFT reports to strengthen medical necessity"
}`,
        maxTokens: 200,
      });

      if (response && !response.error) {
        try {
          const clean = (response.text || "")
            .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(clean);
          setScoreData({
            score: parsed.score ?? null,
            risk: parsed.risk ?? null,
            recommendation: parsed.recommendation ?? null,
          });
          // Save score to DB
          await supabase.from("pre_auth_requests")
            .update({ ai_approval_score: parsed.score ?? null })
            .eq("id", pa.id);
        } catch (parseError) {
          console.error("Could not parse AI score:", parseError);
          setScoreData({ score: null, risk: null, recommendation: null });
        }
      }
    } catch (error) {
      console.error("Approval score calculation failed:", error);
    }
    setScoreLoading(false);
  };

  const saveSummary = async () => {
    if (!selected) return;
    await supabase.from("pre_auth_requests").update({ clinical_summary: editSummary }).eq("id", selected.id);
    toast({ title: "Summary saved" });
    loadData();
  };

  const toggleDoc = (idx: number) => {
    setCheckedDocs(prev => prev.map((v, i) => i === idx ? !v : v));
  };

  const scoreColor = (score: number | null) => {
    if (!score) return "";
    if (score >= 70) return "text-emerald-700";
    if (score >= 40) return "text-amber-700";
    return "text-red-700";
  };

  const scoreLabel = (score: number | null) => {
    if (!score) return "";
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MODERATE";
    return "LOW — Review documentation";
  };

  const scoreBg = (score: number | null) => {
    if (!score) return "bg-muted/50";
    if (score >= 70) return "bg-emerald-50 border-emerald-100";
    if (score >= 40) return "bg-amber-50 border-amber-100";
    return "bg-red-50 border-red-100";
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-[320px] border-r border-border bg-background flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold">Pre-Auth Queue</h3>
          <div className="flex gap-1 mt-2 flex-wrap">
            {["all", "draft", "submitted", "under_review", "approved", "rejected"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>
                {f === "all" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
              No pre-auth requests
            </div>
          ) : filtered.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selected?.id === item.id ? "bg-primary/5 border-primary" : "border-border hover:bg-muted/50"
              )}
            >
              <div className="flex justify-between items-start">
                <span className="text-[13px] font-medium">{patients[item.patient_id] || "Unknown"}</span>
                <Badge variant="outline" className={cn("text-[9px] capitalize", statusColors[item.status])}>{item.status.replace("_", " ")}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{schemes[item.scheme_id] || "Scheme"}</div>
              <div className="text-[11px] font-medium mt-0.5">{item.package_name}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] font-mono">₹{item.requested_amount.toLocaleString("en-IN")}</span>
                {item.ai_approval_score && (
                  <span className={cn("text-[10px] font-bold", scoreColor(item.ai_approval_score))}>
                    {item.ai_approval_score}% {scoreLabel(item.ai_approval_score)}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ClipboardList size={40} className="opacity-30 mb-2" />
            <p className="text-sm">Select a pre-auth request</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold">Pre-Auth: {selected.package_name}</h3>
              <Badge className={cn("capitalize", statusColors[selected.status])}>{selected.status.replace("_", " ")}</Badge>
            </div>

            {/* Patient Info */}
            <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-[11px]">Patient</span><br/>{patients[selected.patient_id]}</div>
              <div><span className="text-muted-foreground text-[11px]">Scheme</span><br/>{schemes[selected.scheme_id]}</div>
              <div><span className="text-muted-foreground text-[11px]">Package</span><br/>{selected.package_code} — {selected.package_name}</div>
              <div><span className="text-muted-foreground text-[11px]">Requested</span><br/>₹{selected.requested_amount.toLocaleString("en-IN")}</div>
            </div>

            {/* Clinical Summary — AI Editable */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot size={14} className="text-primary" />
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">AI Clinical Summary</Label>
              </div>
              <Textarea
                className="min-h-[100px] text-sm"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="AI-generated clinical summary will appear here. Click 'Generate Summary' to auto-fill..."
              />
              {editSummary && (
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                  (AI generated — please review and edit before submission)
                </p>
              )}
              <div className="flex gap-2 mt-1.5">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => generateClinicalSummary(selected)} disabled={aiLoading}>
                  <Bot size={13} /> {aiLoading ? "Generating..." : "Generate Summary"}
                </Button>
                {editSummary !== (selected.clinical_summary || "") && (
                  <Button size="sm" variant="ghost" onClick={saveSummary}>Save Changes</Button>
                )}
              </div>
            </div>

            {/* Documents Checklist */}
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold mb-2 block">
                <FileText size={13} className="inline mr-1" /> Required Documents ({checkedDocs.filter(Boolean).length}/{REQUIRED_DOCS.length})
              </Label>
              <div className="space-y-2">
                {REQUIRED_DOCS.map((doc, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded" checked={checkedDocs[i]} onChange={() => toggleDoc(i)} />
                    {doc}
                  </label>
                ))}
              </div>
            </div>

            {/* AI Approval Score */}
            <div className={cn("border rounded-lg p-3", scoreBg(scoreData.score))}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-muted-foreground font-semibold">Predicted Approval Probability</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => calculateApprovalScore(selected)} disabled={scoreLoading}>
                  <RefreshCw size={12} className={scoreLoading ? "animate-spin" : ""} />
                  {scoreLoading ? "Calculating..." : "Calculate Score"}
                </Button>
              </div>
              {scoreData.score != null ? (
                <>
                  <div className={cn("text-2xl font-bold font-mono", scoreColor(scoreData.score))}>
                    {scoreData.score}% <span className="text-sm">{scoreLabel(scoreData.score)}</span>
                  </div>
                  {scoreData.risk && (
                    <div className="text-[11px] mt-1.5"><strong>Risk:</strong> {scoreData.risk}</div>
                  )}
                  {scoreData.recommendation && (
                    <div className="text-[11px] mt-1 text-primary"><strong>Recommendation:</strong> {scoreData.recommendation}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1.5">Based on: package type, diagnosis match, documentation completeness</div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground py-2">Click "Calculate Score" to get AI-predicted approval probability</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {selected.status === "draft" && (
                <Button onClick={() => updateStatus(selected.id, "submitted", { submitted_at: new Date().toISOString() })} className="gap-1.5">
                  <Send size={14} /> Submit Pre-Auth
                </Button>
              )}
              {(selected.status === "submitted" || selected.status === "under_review") && (
                <>
                  <Button variant="outline" className="gap-1" onClick={() => updateStatus(selected.id, "approved")}>
                    <CheckCircle2 size={14} /> Mark Approved
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => updateStatus(selected.id, "rejected")}>
                    Mark Rejected
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PmjayPreAuthTab;
