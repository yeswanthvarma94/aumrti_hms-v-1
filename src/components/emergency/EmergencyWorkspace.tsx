import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { EDVisit } from "@/pages/emergency/EmergencyPage";

interface Props {
  visit: EDVisit | null;
  hospitalId: string | null;
  userId: string | null;
  onRefresh: () => void;
}

const EmergencyWorkspace: React.FC<Props> = ({ visit, hospitalId, userId, onRefresh }) => {
  const [vitals, setVitals] = useState({ bp_s: "", bp_d: "", pulse: "", spo2: "", gcs: "" });
  const [complaint, setComplaint] = useState("");
  const [ample, setAmple] = useState({ a: "", m: "", p: "", l: "", e: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [mlc, setMlc] = useState(false);
  const [mlcDetails, setMlcDetails] = useState({ police_station: "", officer: "", fir: "", injury_type: "" });
  const [savingVitals, setSavingVitals] = useState(false);

  // Load data when visit changes
  useEffect(() => {
    if (!visit) return;
    setComplaint(visit.chief_complaint || "");
    setDiagnosis(visit.working_diagnosis || "");
    setMlc(visit.mlc);
    setMlcDetails(visit.mlc_details as any || { police_station: "", officer: "", fir: "", injury_type: "" });
    setAmple(visit.ample_history as any || { a: "", m: "", p: "", l: "", e: "" });
    const vs = visit.vitals_snapshot || {};
    setVitals({ bp_s: vs.bp_s || "", bp_d: vs.bp_d || "", pulse: vs.pulse || "", spo2: vs.spo2 || "", gcs: vs.gcs || "" });
  }, [visit?.id]);

  if (!visit) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "#1E293B", borderTop: "1px solid #334155" }}>
        <p className="text-slate-500 text-sm">↑ Select a patient from the triage board</p>
      </div>
    );
  }

  const losMinutes = visit.minutes_ago;
  const losColor = losMinutes < 120 ? "text-emerald-400" : losMinutes < 240 ? "text-amber-400" : "text-red-400";
  const losText = losMinutes < 60 ? `${losMinutes}m` : `${Math.floor(losMinutes / 60)}h ${losMinutes % 60}m`;

  const saveVitals = async () => {
    setSavingVitals(true);
    await supabase.from("ed_visits").update({ vitals_snapshot: vitals, gcs_score: vitals.gcs ? parseInt(vitals.gcs) : null }).eq("id", visit.id);
    setSavingVitals(false);
    toast({ title: "Vitals saved" });
  };

  const saveField = async (field: string, value: any) => {
    await supabase.from("ed_visits").update({ [field]: value }).eq("id", visit.id);
  };

  const handleDisposition = async (disp: string) => {
    await supabase.from("ed_visits").update({
      disposition: disp,
      disposition_time: new Date().toISOString(),
      is_active: disp === "discharged" ? false : true,
    }).eq("id", visit.id);
    toast({ title: `Patient ${disp}` });
    onRefresh();
  };

  return (
    <div className="h-full flex" style={{ background: "#1E293B", borderTop: "1px solid #334155" }}>
      {/* LEFT: Timeline */}
      <div className="w-[200px] flex-shrink-0 flex flex-col p-3 overflow-y-auto" style={{ background: "#162032", borderRight: "1px solid #334155" }}>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Timeline</p>
        <div className="space-y-3 flex-1">
          <TimelineItem filled label="Arrived" time={new Date(visit.arrival_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} />
          <TimelineItem filled label={`Triaged as ${visit.triage_category}`} time="" />
          <TimelineItem filled={!!visit.doctor_id} label="Doctor seen" time="" />
          <TimelineItem filled={false} label="Investigation" time="" />
          <TimelineItem filled={visit.disposition !== "awaiting"} label={visit.disposition !== "awaiting" ? `Disposition: ${visit.disposition}` : "Disposition"} time={visit.disposition !== "awaiting" ? "Done" : ""} />
        </div>

        <div className="mt-auto pt-3 border-t border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Time in ED</p>
          <p className={cn("text-lg font-bold font-mono tabular-nums", losColor)}>{losText}</p>
        </div>
      </div>

      {/* CENTER: Clinical Entry */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Vitals row */}
        <div className="flex gap-2 items-end">
          <VInput label="BP Sys" value={vitals.bp_s} onChange={v => setVitals({ ...vitals, bp_s: v })} placeholder="120" />
          <span className="text-slate-500 pb-2">/</span>
          <VInput label="Dia" value={vitals.bp_d} onChange={v => setVitals({ ...vitals, bp_d: v })} placeholder="80" />
          <VInput label="Pulse" value={vitals.pulse} onChange={v => setVitals({ ...vitals, pulse: v })} placeholder="88" />
          <VInput label="SpO2" value={vitals.spo2} onChange={v => setVitals({ ...vitals, spo2: v })} placeholder="98" />
          <VInput label="GCS" value={vitals.gcs} onChange={v => setVitals({ ...vitals, gcs: v })} placeholder="15" />
          <Button size="sm" onClick={saveVitals} disabled={savingVitals} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 mb-0.5">
            {savingVitals ? "..." : "Save"}
          </Button>
        </div>

        {/* Chief complaint */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chief Complaint</label>
          <Textarea value={complaint} onChange={e => setComplaint(e.target.value)}
            onBlur={() => saveField("chief_complaint", complaint)}
            placeholder="Chief complaint / presenting history..."
            className="mt-1 text-sm resize-none text-white border-slate-600 h-16"
            style={{ background: "#0F172A" }} />
        </div>

        {/* AMPLE */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AMPLE History</label>
          <div className="grid grid-cols-5 gap-1.5 mt-1">
            {(["a", "m", "p", "l", "e"] as const).map(key => (
              <div key={key}>
                <span className="text-[9px] text-slate-500 uppercase font-bold">{key === "a" ? "Allergies" : key === "m" ? "Meds" : key === "p" ? "Past Hx" : key === "l" ? "Last Meal" : "Events"}</span>
                <Input value={(ample as any)[key]} onChange={e => setAmple({ ...ample, [key]: e.target.value })}
                  onBlur={() => saveField("ample_history", ample)}
                  className="h-7 text-[11px] text-white border-slate-600 mt-0.5"
                  style={{ background: "#0F172A" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Diagnosis */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Working Diagnosis</label>
          <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
            onBlur={() => saveField("working_diagnosis", diagnosis)}
            placeholder="Working diagnosis..."
            className="h-8 text-sm text-white border-slate-600 mt-1"
            style={{ background: "#0F172A" }} />
        </div>

        {/* MLC */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mlc} onChange={e => { setMlc(e.target.checked); saveField("mlc", e.target.checked); }}
              className="rounded border-slate-600" />
            <span className="text-xs text-slate-400 font-medium">Medico-Legal Case (MLC)</span>
          </label>
          {mlc && (
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[
                { k: "police_station", l: "Police Station" },
                { k: "officer", l: "Officer Name" },
                { k: "fir", l: "FIR Number" },
                { k: "injury_type", l: "Injury Type" },
              ].map(f => (
                <div key={f.k}>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">{f.l}</span>
                  <Input value={(mlcDetails as any)[f.k] || ""} onChange={e => setMlcDetails({ ...mlcDetails, [f.k]: e.target.value })}
                    onBlur={() => saveField("mlc_details", mlcDetails)}
                    className="h-7 text-[11px] text-white border-slate-600 mt-0.5"
                    style={{ background: "#0F172A" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="w-[170px] flex-shrink-0 flex flex-col gap-2 p-3 overflow-y-auto" style={{ background: "#162032", borderLeft: "1px solid #334155" }}>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Actions</p>

        <ActionBtn label="🛏️ Admit to IPD" bg="#3B82F6" onClick={() => { handleDisposition("admitted"); toast({ description: "Route to IPD admission" }); }} />
        <ActionBtn label="🔬 STAT Lab" bg="#8B5CF6" onClick={() => toast({ title: "STAT Lab", description: "Lab orders module coming in Phase 5" })} />
        <ActionBtn label="🩸 Blood Request" bg="#EF4444" onClick={() => toast({ title: "Blood Bank", description: "Blood request module coming in Phase 5" })} />
        <ActionBtn label="📟 Call Specialist" bg="#F59E0B" onClick={() => toast({ title: "Specialist Alert", description: "Specialist notification coming in Phase 5" })} />
        <ActionBtn label="🏠 Discharge" bg="#10B981" onClick={() => handleDisposition("discharged")} />
        {mlc && <ActionBtn label="📄 MLC Register" bg="#7C3AED" onClick={() => toast({ title: "MLC", description: "MLC register coming in Phase 5" })} />}

        <div className="mt-auto pt-2 border-t border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Status</p>
          <p className="text-xs text-slate-300 capitalize font-medium mt-0.5">{visit.disposition}</p>
        </div>
      </div>
    </div>
  );
};

const VInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">{label}</span>
    <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="h-8 w-16 text-xs text-white border-slate-600"
      style={{ background: "#0F172A" }} type="number" />
  </div>
);

const ActionBtn = ({ label, bg, onClick }: { label: string; bg: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
    style={{ background: bg }}
  >{label}</button>
);

const TimelineItem = ({ filled, label, time }: { filled: boolean; label: string; time: string }) => (
  <div className="flex items-start gap-2">
    <div className={cn("w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 border-2", filled ? "bg-emerald-400 border-emerald-400" : "border-slate-600 bg-transparent")} />
    <div>
      <p className={cn("text-[11px] leading-tight", filled ? "text-slate-300" : "text-slate-600")}>{label}</p>
      {time && <p className="text-[10px] text-slate-500">{time}</p>}
    </div>
  </div>
);

export default EmergencyWorkspace;
