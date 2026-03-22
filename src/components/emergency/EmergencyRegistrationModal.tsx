import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  hospitalId: string | null;
  onRegistered: () => void;
}

const triageLevels = [
  { key: "P1", label: "🔴 P1 - IMMEDIATE", color: "#EF4444" },
  { key: "P2", label: "🟠 P2 - URGENT", color: "#F97316" },
  { key: "P3", label: "🟡 P3 - DELAYED", color: "#EAB308" },
  { key: "P4", label: "🟢 P4 - MINOR", color: "#22C55E" },
];

const EmergencyRegistrationModal: React.FC<Props> = ({ open, onClose, hospitalId, onRegistered }) => {
  const [name, setName] = useState("Unknown");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [triage, setTriage] = useState("");
  const [complaint, setComplaint] = useState("");
  const [mlc, setMlc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [linkedPatient, setLinkedPatient] = useState<{ id: string; full_name: string; uhid: string } | null>(null);
  const [phoneResults, setPhoneResults] = useState<{ id: string; full_name: string; uhid: string; phone: string | null }[]>([]);

  // Phone search for existing patients
  useEffect(() => {
    if (phoneSearch.length < 3 || !hospitalId) { setPhoneResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("patients")
        .select("id, full_name, uhid, phone")
        .eq("hospital_id", hospitalId)
        .or(`phone.ilike.%${phoneSearch}%,full_name.ilike.%${phoneSearch}%`)
        .limit(3);
      setPhoneResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [phoneSearch, hospitalId]);

  const reset = () => {
    setName("Unknown"); setAge(""); setGender("male"); setTriage(""); setComplaint(""); setMlc(false);
    setPhoneSearch(""); setLinkedPatient(null); setPhoneResults([]);
  };

  const handleSubmit = async () => {
    if (!triage || !hospitalId) {
      toast({ title: "Select triage category", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let patientId: string;

    if (linkedPatient) {
      // Use existing patient record
      patientId = linkedPatient.id;
    } else {
      // Create new patient
      const dob = age ? new Date(Date.now() - parseInt(age) * 31557600000).toISOString().split("T")[0] : null;
      const uhid = `ED-${Date.now().toString(36).toUpperCase()}`;
      const { data: patient, error: pErr } = await supabase.from("patients").insert({
        hospital_id: hospitalId,
        full_name: name || "Unknown",
        dob,
        gender: gender as any,
        uhid,
      }).select("id").single();

      if (pErr || !patient) {
        toast({ title: "Error", description: pErr?.message || "Failed to create patient", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      patientId = patient.id;
    }

    // Create ED visit
    const { error: vErr } = await supabase.from("ed_visits").insert({
      hospital_id: hospitalId,
      patient_id: patientId,
      triage_category: triage,
      chief_complaint: complaint || null,
      mlc,
      arrival_mode: "walkin",
    });

    setSubmitting(false);
    if (vErr) {
      toast({ title: "Error", description: vErr.message, variant: "destructive" });
      return;
    }

    toast({ title: `Patient triaged as ${triage}` });
    reset();
    onClose();
    onRegistered();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[420px]" style={{ background: "#1E293B", border: "1px solid #334155" }}>
        <DialogHeader>
          <DialogTitle className="text-lg text-white">Emergency Registration</DialogTitle>
          <DialogDescription className="text-slate-400">Minimum details to begin treatment</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Unknown"
              className="h-10 text-sm mt-1 text-white border-slate-600"
              style={{ background: "#0F172A" }} />

            {/* Optional phone search */}
            {!linkedPatient && (
              <div className="mt-2">
                <p className="text-[11px] text-slate-500 mb-1">Know their phone? Search existing records:</p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <Input value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)}
                    placeholder="Search by phone or name..."
                    className="h-7 text-[11px] pl-7 text-white border-slate-600"
                    style={{ background: "#0F172A" }} />
                </div>
                {phoneResults.length > 0 && (
                  <div className="mt-1 border border-slate-600 rounded-md overflow-hidden">
                    {phoneResults.map(p => (
                      <button key={p.id} onClick={() => { setLinkedPatient(p); setName(p.full_name); setPhoneResults([]); setPhoneSearch(""); }}
                        className="w-full text-left px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 border-b border-slate-700 last:border-0">
                        {p.full_name} · {p.uhid} · {p.phone || "—"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {linkedPatient && (
              <div className="mt-2 p-2 rounded-md border border-emerald-600/40" style={{ background: "rgba(16,185,129,0.1)" }}>
                <p className="text-[11px] text-emerald-400 font-medium">✓ Linked to: {linkedPatient.full_name} ({linkedPatient.uhid})</p>
                <button onClick={() => { setLinkedPatient(null); setName("Unknown"); }} className="text-[10px] text-slate-500 hover:text-slate-300 mt-0.5">Unlink</button>
              </div>
            )}
          </div>

          {/* Age + Gender */}
          <div className="flex gap-3">
            <div className="w-24">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Age (est.)</label>
              <Input value={age} onChange={e => setAge(e.target.value)} placeholder="~"
                type="number" className="h-12 text-lg font-bold mt-1 text-white border-slate-600 text-center"
                style={{ background: "#0F172A" }} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
              <div className="flex gap-1.5 mt-1">
                {(["male", "female", "other"] as const).map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={cn("flex-1 h-12 rounded-lg text-sm font-bold border transition-all capitalize",
                      gender === g ? "bg-blue-600 text-white border-blue-600" : "border-slate-600 text-slate-400 hover:border-slate-500"
                    )}>{g === "other" ? "?" : g[0].toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Triage — most important */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Triage Category *</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {triageLevels.map(t => (
                <button key={t.key} onClick={() => setTriage(t.key)}
                  className={cn(
                    "h-16 rounded-lg text-sm font-bold border-2 transition-all",
                    triage === t.key ? "text-white" : "border-slate-600 text-slate-400 hover:border-slate-500"
                  )}
                  style={triage === t.key ? { background: t.color, borderColor: t.color } : {}}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Complaint */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chief Complaint (optional)</label>
            <Textarea value={complaint} onChange={e => setComplaint(e.target.value)}
              placeholder="Brief complaint..."
              className="mt-1 text-sm resize-none text-white border-slate-600 h-14"
              style={{ background: "#0F172A" }} />
          </div>

          {/* MLC */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mlc} onChange={e => setMlc(e.target.checked)} className="rounded border-slate-600" />
            <span className="text-xs text-slate-400">Medico-Legal Case?</span>
          </label>

          <Button onClick={handleSubmit} disabled={submitting || !triage}
            className="w-full h-11 text-sm font-bold"
            style={{ background: "#22C55E" }}>
            {submitting ? "Registering..." : "Register & Triage →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyRegistrationModal;
