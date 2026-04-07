import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callAI } from "@/lib/aiProvider";
import { toast } from "sonner";
import { logNABHEvidence } from "@/lib/nabh-evidence";

interface Props {
  admissionId: string;
  hospitalId: string;
  billingCleared?: boolean;
  onSummaryDone: () => void;
}

const DischargeSummaryGenerator: React.FC<Props> = ({ admissionId, hospitalId, billingCleared = true, onSummaryDone }) => {
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setSummary("");

    try {
      // Gather admission + patient data
      const { data: admission } = await supabase.from("admissions")
        .select("*, patients(full_name, age, gender, blood_group, allergies)")
        .eq("id", admissionId).maybeSingle();

      if (!admission) {
        toast.error("Admission not found");
        setGenerating(false);
        return;
      }

      // Get ward/bed names
      const [wardRes, bedRes] = await Promise.all([
        supabase.from("wards").select("ward_name").eq("id", admission.ward_id).maybeSingle(),
        supabase.from("beds").select("bed_number").eq("id", admission.bed_id).maybeSingle(),
      ]);

      // Ward round notes as clinical notes
      const { data: rounds } = await (supabase as any).from("ward_round_notes")
        .select("subjective, objective, assessment, plan, created_at")
        .eq("admission_id", admissionId)
        .order("created_at", { ascending: false })
        .limit(5);

      const notesText = (rounds || []).map((r: any) =>
        [r.subjective, r.objective, r.assessment, r.plan].filter(Boolean).join(" | ")
      ).join("\n---\n") || "Not available";

      // Lab results
      const { data: labs } = await (supabase as any).from("lab_order_items")
        .select("test_name, result, unit, normal_range_low, normal_range_high")
        .eq("patient_id", admission.patient_id)
        .gte("created_at", admission.admitted_at || "2000-01-01")
        .order("created_at", { ascending: false })
        .limit(20);

      // Medications
      const { data: meds } = await (supabase as any).from("ipd_medications")
        .select("drug_name, dose, frequency, route")
        .eq("admission_id", admissionId)
        .eq("is_active", true);

      // OT
      const { data: ot } = await (supabase as any).from("ot_schedules")
        .select("surgery_type, procedure_notes")
        .eq("admission_id", admissionId)
        .maybeSingle();

      const patient = admission.patients as any;
      const admittedDate = admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString("en-IN") : "Unknown";
      const los = admission.admitted_at
        ? Math.ceil((Date.now() - new Date(admission.admitted_at).getTime()) / 86400000)
        : 0;

      const response = await callAI({
        featureKey: "voice_scribe",
        hospitalId,
        prompt: `Generate a professional hospital discharge summary for an Indian hospital.

PATIENT:
Name: ${patient?.full_name || "Unknown"}
Age/Gender: ${patient?.age || "—"}yrs / ${patient?.gender || "—"}
Blood Group: ${patient?.blood_group || "Not recorded"}
Allergies: ${Array.isArray(patient?.allergies) ? patient.allergies.join(", ") : patient?.allergies || "NKDA"}

ADMISSION:
Date: ${admittedDate}
Discharge: Today
Ward: ${(wardRes?.data as any)?.ward_name || "—"} | Bed: ${(bedRes?.data as any)?.bed_number || "—"}
Diagnosis: ${admission.admitting_diagnosis || "As per treating doctor"}
Length of Stay: ${los} days

CLINICAL NOTES (most recent):
${notesText}

${ot ? `SURGICAL PROCEDURE: ${ot.surgery_type}\n${ot.procedure_notes ? "Notes: " + ot.procedure_notes.slice(0, 200) : ""}` : ""}

KEY LAB RESULTS:
${labs?.map((l: any) => `${l.test_name}: ${l.result} ${l.unit || ""}`).join(", ") || "Not available"}

CURRENT MEDICATIONS:
${meds?.map((m: any) => `${m.drug_name} ${m.dose} ${m.frequency}`).join("\n") || "None prescribed"}

Write a professional discharge summary with these sections:
1. Presenting Complaint & History
2. Examination Findings
3. Investigations
4. Hospital Course & Treatment
5. Discharge Condition
6. Medications at Discharge
7. Instructions to Patient
8. Follow-up Plan

Use formal medical language. Keep factual. Do not invent details not provided. Max 400 words.`,
        maxTokens: 600,
      });

      if (response.error) {
        toast.error("AI unavailable — write summary manually");
        setGenerating(false);
        return;
      }

      setSummary(response.text);

      // Log to ai_feature_logs
      await (supabase as any).from("ai_feature_logs").insert({
        hospital_id: hospitalId,
        feature_key: "discharge_summary",
        module: "ipd",
        patient_id: admission.patient_id,
        success: true,
        input_summary: `Admission ${admissionId} | LOS: ${los}d`,
        output_summary: `Generated ${response.text.length} chars`,
        tokens_used: (response as any).tokens_used || null,
      });
    } catch (err) {
      console.error("Discharge summary generation failed:", err);
      toast.error("Failed to generate summary. Write manually.");
    }

    setGenerating(false);
  };

  const signSummary = async () => {
    if (!summary.trim()) {
      toast.error("Summary is empty");
      return;
    }
    if (!billingCleared) {
      toast.error("Cannot discharge — billing not cleared");
      return;
    }

    setSigning(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSigning(false); return; }

    const { data: userData } = await (supabase as any).from("users")
      .select("id").eq("auth_user_id", user.id).maybeSingle();

    const { error } = await supabase.from("admissions").update({
      discharge_summary_done: true,
      status: "discharged",
      discharged_at: new Date().toISOString(),
    } as any).eq("id", admissionId);

    if (error) {
      toast.error(error.message);
      setSigning(false);
      return;
    }

    // Get bed for housekeeping
    const { data: adm } = await supabase.from("admissions")
      .select("bed_id, ward_id").eq("id", admissionId).maybeSingle();

    if (adm?.bed_id) {
      await supabase.from("beds").update({ status: "cleaning" as any }).eq("id", adm.bed_id);
      const { data: bedData } = await supabase.from("beds").select("bed_number").eq("id", adm.bed_id).maybeSingle();

      await (supabase as any).from("housekeeping_tasks").insert({
        hospital_id: hospitalId,
        task_type: "bed_turnover",
        ward_id: adm.ward_id,
        bed_id: adm.bed_id,
        room_number: bedData?.bed_number || null,
        triggered_by: "discharge",
        trigger_ref_id: admissionId,
        priority: "high",
        status: "pending",
        checklist: [
          { item: "Remove soiled linen", done: false },
          { item: "Clean mattress with disinfectant", done: false },
          { item: "Fit fresh linen", done: false },
          { item: "Clean bedside table", done: false },
          { item: "Mop floor", done: false },
          { item: "Supervisor inspection", done: false },
        ],
      });

      toast.success(`Patient discharged — housekeeping task created for bed ${bedData?.bed_number || ""}`);
    } else {
      toast.success("Patient discharged");
    }

    setSigned(true);
    setSigning(false);

    // WhatsApp discharge summary (non-blocking)
    try {
      const { data: patient } = await supabase.from("patients")
        .select("full_name, uhid, phone")
        .eq("id", (await supabase.from("admissions").select("patient_id").eq("id", admissionId).maybeSingle()).data?.patient_id)
        .maybeSingle();

      const phone = patient?.phone;
      if (phone && summary) {
        const shortSummary = summary.slice(0, 300).replace(/\n/g, " ");
        const msg = `🏥 Discharge Summary\n\nPatient: ${patient.full_name} (${patient.uhid})\nDate: ${new Date().toLocaleDateString("en-IN")}\n\n${shortSummary}...\n\nPlease follow your doctor's instructions. For emergencies, contact the hospital.`;
        const clean = phone.replace(/\D/g, "");
        const intl = clean.startsWith("91") ? clean : `91${clean}`;
        window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
        toast.success("Discharge summary sent via WhatsApp");
      }
    } catch (whatsErr) {
      console.error("WhatsApp discharge failed:", whatsErr);
    }

    logNABHEvidence(hospitalId, "COP.10",
      `Discharge summary completed: Patient ${admissionId}, AI-assisted: ${summary ? "Yes" : "No"}`);

    onSummaryDone();
  };

  if (signed) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-sm font-semibold text-emerald-600">✅ Discharge summary signed — patient discharged</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!summary ? (
        <div className="text-center py-4 space-y-3">
          <Bot className="h-8 w-8 text-primary mx-auto opacity-60" />
          <p className="text-xs text-muted-foreground">AI will analyse clinical notes, lab results, medications, and procedures to generate a professional discharge summary.</p>
          <Button onClick={generate} disabled={generating} className="bg-primary hover:bg-primary/90">
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analysing clinical data...</>
            ) : (
              <><Bot className="h-4 w-4 mr-2" /> Generate AI Discharge Summary</>
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              AI-Generated — Doctor must review and sign before discharge
            </span>
          </div>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="min-h-[250px] text-sm font-sans leading-relaxed"
          />
          <div className="flex gap-2">
            <Button onClick={signSummary} disabled={signing} className="flex-1">
              {signing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Sign Discharge Summary & Discharge
            </Button>
            <Button variant="outline" onClick={generate} disabled={generating} size="sm">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Regenerate"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DischargeSummaryGenerator;
