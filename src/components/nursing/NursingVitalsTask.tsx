import React, { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { NursingTask } from "@/pages/nursing/NursingPage";

interface Props {
  task: NursingTask;
  onComplete: () => void;
}

function calcNEWS2(v: Record<string, string>): number {
  let score = 0;
  const rr = Number(v.respiratory_rate);
  if (rr) { if (rr <= 8) score += 3; else if (rr <= 11) score += 1; else if (rr <= 20) score += 0; else if (rr <= 24) score += 2; else score += 3; }
  const spo2 = Number(v.spo2);
  if (spo2) { if (spo2 <= 91) score += 3; else if (spo2 <= 93) score += 2; else if (spo2 <= 95) score += 1; }
  const sys = Number(v.bp_systolic);
  if (sys) { if (sys <= 90) score += 3; else if (sys <= 100) score += 2; else if (sys <= 110) score += 1; else if (sys <= 219) score += 0; else score += 3; }
  const pulse = Number(v.pulse);
  if (pulse) { if (pulse <= 40) score += 3; else if (pulse <= 50) score += 1; else if (pulse <= 90) score += 0; else if (pulse <= 110) score += 1; else if (pulse <= 130) score += 2; else score += 3; }
  const temp = Number(v.temperature);
  if (temp) {
    const f = temp;
    if (f <= 95) score += 3; else if (f <= 96.8) score += 1; else if (f <= 100.4) score += 0; else if (f <= 102.2) score += 1; else score += 2;
  }
  return score;
}

const NursingVitalsTask: React.FC<Props> = ({ task, onComplete }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [vitals, setVitals] = useState<Record<string, string>>({
    bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "",
    spo2: "", respiratory_rate: "", grbs: "", urine_output_ml: "", pain_score: "",
  });
  const [showExtra, setShowExtra] = useState(false);

  const set = (k: string, v: string) => setVitals((p) => ({ ...p, [k]: v }));

  const news2 = useMemo(() => calcNEWS2(vitals), [vitals]);
  const hasValues = vitals.bp_systolic || vitals.pulse || vitals.spo2;

  const handleSave = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { error } = await supabase.from("ipd_vitals").insert({
      hospital_id: task.hospitalId!,
      admission_id: task.admissionId,
      recorded_by: userId!,
      bp_systolic: vitals.bp_systolic ? Number(vitals.bp_systolic) : null,
      bp_diastolic: vitals.bp_diastolic ? Number(vitals.bp_diastolic) : null,
      pulse: vitals.pulse ? Number(vitals.pulse) : null,
      temperature: vitals.temperature ? Number(vitals.temperature) : null,
      spo2: vitals.spo2 ? Number(vitals.spo2) : null,
      respiratory_rate: vitals.respiratory_rate ? Number(vitals.respiratory_rate) : null,
      grbs: vitals.grbs ? Number(vitals.grbs) : null,
      urine_output_ml: vitals.urine_output_ml ? Number(vitals.urine_output_ml) : null,
      pain_score: vitals.pain_score ? Number(vitals.pain_score) : null,
      news2_score: hasValues ? news2 : null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Error saving vitals", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Vitals recorded — NEWS2: ${news2}` });

      // Auto-escalate if NEWS2 >= 5
      if (news2 >= 5) {
        await supabase.from("clinical_alerts").insert({
          hospital_id: task.hospitalId!,
          patient_id: task.patientId,
          alert_type: "high_news2",
          severity: "critical",
          alert_message: `NEWS2 Score ${news2} for ${task.patientName} at ${task.bedLabel}`,
          bed_number: task.bedLabel,
        });
      }
      onComplete();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Context */}
      <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{task.patientName}</span>
        <span>{task.bedLabel}</span>
        {task.diagnosis && <span className="italic truncate">{task.diagnosis}</span>}
        {task.doctorName && <span className="ml-auto">Dr. {task.doctorName}</span>}
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "bp_systolic", label: "BP Systolic", placeholder: "120", unit: "mmHg" },
          { key: "bp_diastolic", label: "BP Diastolic", placeholder: "80", unit: "mmHg" },
          { key: "pulse", label: "Pulse", placeholder: "72", unit: "bpm" },
          { key: "temperature", label: "Temperature", placeholder: "98.6", unit: "°F" },
          { key: "spo2", label: "SpO2", placeholder: "98", unit: "%" },
          { key: "respiratory_rate", label: "Resp. Rate", placeholder: "16", unit: "/min" },
        ].map((f) => (
          <div key={f.key} className="bg-card rounded-lg border border-border p-3">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</Label>
            <div className="flex items-baseline gap-1 mt-1">
              <Input
                type="number"
                value={vitals[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="h-11 text-lg font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
              />
              <span className="text-[10px] text-muted-foreground">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Extra fields */}
      {!showExtra && (
        <button onClick={() => setShowExtra(true)} className="text-xs text-primary hover:underline">
          + GCS, Urine output, Blood glucose, Pain score
        </button>
      )}
      {showExtra && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "grbs", label: "GRBS", placeholder: "110", unit: "mg/dL" },
            { key: "urine_output_ml", label: "Urine Output", placeholder: "200", unit: "mL" },
            { key: "pain_score", label: "Pain (0-10)", placeholder: "3", unit: "" },
          ].map((f) => (
            <div key={f.key} className="bg-card rounded-lg border border-border p-3">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</Label>
              <Input
                type="number"
                value={vitals[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="h-10 text-base font-semibold border-0 p-0 mt-1 focus-visible:ring-0 bg-transparent"
              />
            </div>
          ))}
        </div>
      )}

      {/* NEWS2 */}
      {hasValues && (
        <div className={cn(
          "rounded-lg p-4 text-center border",
          news2 < 3 && "bg-green-50 border-green-200",
          news2 >= 3 && news2 < 5 && "bg-amber-50 border-amber-200",
          news2 >= 5 && "bg-destructive/10 border-destructive/30",
        )}>
          <p className="text-xs font-semibold text-muted-foreground uppercase">NEWS2 Score</p>
          <p className={cn(
            "text-3xl font-bold mt-1",
            news2 < 3 && "text-green-700",
            news2 >= 3 && news2 < 5 && "text-amber-700",
            news2 >= 5 && "text-destructive",
          )}>
            {news2}
          </p>
          {news2 >= 5 && (
            <div className="mt-2 flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle size={14} />
              <span className="text-xs font-bold">Escalation required — alert will be sent</span>
            </div>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={!hasValues || saving} className="w-full h-[52px] text-sm font-bold">
        {saving ? "Saving…" : "💾 Save Vitals"}
      </Button>
    </div>
  );
};

export default NursingVitalsTask;
