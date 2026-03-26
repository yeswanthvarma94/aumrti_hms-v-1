import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp } from "lucide-react";
import VoiceDictationButton from "@/components/voice/VoiceDictationButton";
import { useVoiceScribe } from "@/contexts/VoiceScribeContext";

interface Props {
  admissionId: string;
  hospitalId: string | null;
  userId: string | null;
  patientId: string | null;
}

interface RoundNote {
  id: string;
  round_date: string;
  round_time: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  doctor_id: string;
}

const IPDWardRoundTab: React.FC<Props> = ({ admissionId, hospitalId, userId, patientId }) => {
  const { registerScreen, unregisterScreen } = useVoiceScribe();
  const [notes, setNotes] = useState<RoundNote[]>([]);
  const [form, setForm] = useState({ s: "", o: "", a: "", p: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Register fill function for voice scribe
  useEffect(() => {
    const fillFn = (data: Record<string, unknown>) => {
      setForm((prev) => ({
        s: (data.subjective as string) || prev.s,
        o: (data.objective as string) || prev.o,
        a: (data.assessment as string) || prev.a,
        p: (data.plan as string) || prev.p,
      }));
    };
    registerScreen("ward_round", fillFn);
    return () => unregisterScreen("ward_round");
  }, [registerScreen, unregisterScreen]);

  const fetchNotes = useCallback(() => {
    if (!admissionId) return;
    supabase.from("ward_round_notes")
      .select("*")
      .eq("admission_id", admissionId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setNotes((data as unknown as RoundNote[]) || []));
  }, [admissionId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleSave = async () => {
    if (!hospitalId || !userId || !patientId) return;
    if (!form.s && !form.o && !form.a && !form.p) {
      toast({ title: "Please fill at least one SOAP field", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ward_round_notes").insert({
      admission_id: admissionId,
      hospital_id: hospitalId,
      doctor_id: userId,
      patient_id: patientId,
      subjective: form.s || null,
      objective: form.o || null,
      assessment: form.a || null,
      plan: form.p || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ward round note saved" });
    setForm({ s: "", o: "", a: "", p: "" });
    fetchNotes();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-4">
      {/* Add note form */}
      <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg p-3 mb-3">
        <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">New Ward Round Note</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">S — Subjective</label>
            <Textarea value={form.s} onChange={(e) => setForm({ ...form, s: e.target.value })}
              placeholder="How is the patient feeling?" className="h-16 text-xs resize-none mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">O — Objective</label>
            <Textarea value={form.o} onChange={(e) => setForm({ ...form, o: e.target.value })}
              placeholder="Examination findings, vitals" className="h-16 text-xs resize-none mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">A — Assessment</label>
            <Textarea value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })}
              placeholder="Clinical assessment" className="h-16 text-xs resize-none mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">P — Plan</label>
            <Textarea value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })}
              placeholder="Today's plan" className="h-16 text-xs resize-none mt-0.5" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <VoiceDictationButton sessionType="ward_round" size="sm" />
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#1A2F5A] hover:bg-[#152647] text-xs h-8">
            {saving ? "Saving..." : "Save Round Note"}
          </Button>
        </div>
      </div>

      {/* Previous rounds */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Rounds</p>
        {notes.map((n) => (
          <div key={n.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setExpanded(expanded === n.id ? null : n.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-800">
                  {new Date(n.round_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <span className="text-[11px] text-slate-400">{n.round_time?.slice(0, 5)}</span>
              </div>
              {expanded === n.id ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
            </button>
            {expanded === n.id && (
              <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                {[
                  { l: "Subjective", v: n.subjective },
                  { l: "Objective", v: n.objective },
                  { l: "Assessment", v: n.assessment },
                  { l: "Plan", v: n.plan },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{s.l}</p>
                    <p className="text-xs text-slate-700 mt-0.5">{s.v || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {notes.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No round notes yet</p>}
      </div>
    </div>
  );
};

export default IPDWardRoundTab;
