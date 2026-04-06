import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Modality } from "@/pages/radiology/RadiologyPage";

interface Props {
  hospitalId: string;
  modalities: Modality[];
  onClose: () => void;
  onCreated: () => void;
}

interface PatientResult {
  id: string;
  full_name: string;
  uhid: string;
  gender: string | null;
  dob: string | null;
  phone: string | null;
  address: string | null;
}

// Study presets with auto-modality mapping
const STUDY_GROUPS = [
  {
    label: "X-Ray",
    studies: [
      { name: "X-Ray Chest PA View", modality: "xray", part: "Chest" },
      { name: "X-Ray Chest AP View", modality: "xray", part: "Chest" },
      { name: "X-Ray KUB", modality: "xray", part: "Abdomen" },
      { name: "X-Ray LS Spine AP/Lat", modality: "xray", part: "Spine" },
      { name: "X-Ray Knee AP/Lat", modality: "xray", part: "Knee" },
      { name: "X-Ray Skull AP/Lat", modality: "xray", part: "Skull" },
    ],
  },
  {
    label: "Ultrasound",
    studies: [
      { name: "USG Abdomen", modality: "usg", part: "Abdomen" },
      { name: "USG Pelvis", modality: "usg", part: "Pelvis" },
      { name: "USG Abdomen + Pelvis", modality: "usg", part: "Abdomen, Pelvis" },
      { name: "USG Neck", modality: "usg", part: "Neck" },
      { name: "USG Breast", modality: "usg", part: "Breast" },
      { name: "USG KUB + Prostate", modality: "usg", part: "KUB" },
      { name: "USG Obstetric", modality: "usg", part: "Pelvis" },
      { name: "USG Thyroid", modality: "usg", part: "Thyroid" },
      { name: "Doppler Study", modality: "usg", part: "" },
    ],
  },
  {
    label: "Cardiac",
    studies: [
      { name: "ECG", modality: "ecg", part: "Heart" },
      { name: "2D Echo + Doppler", modality: "echo", part: "Heart" },
      { name: "Stress ECG (TMT)", modality: "ecg", part: "Heart" },
    ],
  },
  {
    label: "Advanced",
    studies: [
      { name: "CT Brain Plain", modality: "ct", part: "Brain" },
      { name: "CT Chest", modality: "ct", part: "Chest" },
      { name: "CT Abdomen + Pelvis", modality: "ct", part: "Abdomen, Pelvis" },
      { name: "MRI Brain", modality: "mri", part: "Brain" },
      { name: "MRI Spine", modality: "mri", part: "Spine" },
      { name: "DEXA Scan", modality: "dexa", part: "Spine, Hip" },
    ],
  },
];

const NewRadiologyOrderModal: React.FC<Props> = ({ hospitalId, modalities, onClose, onCreated }) => {
  const { toast } = useToast();
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [studyName, setStudyName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [selectedModalityType, setSelectedModalityType] = useState("");
  const [priority, setPriority] = useState("routine");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [isPcpndt, setIsPcpndt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("id").eq("auth_user_id", user.id).limit(1).maybeSingle();
      if (data) setCurrentUserId(data.id);
    })();
  }, []);

  // Patient search
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, uhid, gender, dob, phone, address")
        .eq("hospital_id", hospitalId)
        .or(`full_name.ilike.%${patientSearch}%,uhid.ilike.%${patientSearch}%,phone.ilike.%${patientSearch}%`)
        .limit(6);
      setPatientResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, hospitalId]);

  const selectStudyChip = (study: { name: string; modality: string; part: string }) => {
    setStudyName(study.name);
    setSelectedModalityType(study.modality);
    setBodyPart(study.part);
    // Auto-enable PCPNDT for obstetric USG
    if (study.modality === "usg" && study.name.toLowerCase().includes("obstetric")) {
      setIsPcpndt(true);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !studyName || !selectedModalityType || !currentUserId) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    let matchedModality = modalities.find(m => m.modality_type === selectedModalityType);
    if (!matchedModality) {
      // Auto-create the modality instead of blocking
      const { data: newMod, error: modErr } = await supabase
        .from("radiology_modalities")
        .insert({ hospital_id: hospitalId, name: selectedModalityType.toUpperCase(), modality_type: selectedModalityType, is_active: true } as any)
        .select("id, name, modality_type, is_active")
        .single();
      if (modErr || !newMod) {
        toast({ title: "Failed to create modality", description: modErr?.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      matchedModality = newMod;
    }

    setSubmitting(true);

    // Generate accession number
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const { count } = await supabase
      .from("radiology_orders")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .eq("order_date", new Date().toISOString().split("T")[0]);
    const seq = String((count || 0) + 1).padStart(4, "0");
    const accessionNumber = `RAD-${today}-${seq}`;

    const { data: orderData, error: orderError } = await supabase
      .from("radiology_orders")
      .insert({
        hospital_id: hospitalId,
        patient_id: selectedPatient.id,
        modality_id: matchedModality.id,
        modality_type: selectedModalityType,
        study_name: studyName,
        body_part: bodyPart || null,
        clinical_history: clinicalHistory || null,
        ordered_by: currentUserId,
        priority,
        accession_number: accessionNumber,
        is_pcpndt: isPcpndt,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Radiology order insert error:", orderError);
      toast({ title: "Failed to create order", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Create empty report record
    await supabase.from("radiology_reports").insert({
      hospital_id: hospitalId,
      order_id: orderData.id,
      patient_id: selectedPatient.id,
    });

    // Create PCPNDT form if needed
    if (isPcpndt) {
      await supabase.from("pcpndt_form_f").insert({
        hospital_id: hospitalId,
        order_id: orderData.id,
        patient_name: selectedPatient.full_name,
        patient_age: selectedPatient.dob
          ? Math.floor((Date.now() - new Date(selectedPatient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
        patient_address: selectedPatient.address || null,
        signed_by: currentUserId,
      });
    }

    toast({ title: `Radiology order created — ${studyName}` });
    setSubmitting(false);
    onCreated();
  };

  const getAge = (dob: string | null) => {
    if (!dob) return "";
    return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}y`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-foreground">New Radiology Order</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>
        <p className="text-[13px] text-muted-foreground mb-5">Search patient, select study, set priority</p>

        {/* Patient search */}
        <label className="text-xs font-semibold text-foreground mb-1 block">Patient *</label>
        {selectedPatient ? (
          <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-muted/30 mb-4">
            <div className="w-8 h-8 rounded-full bg-[hsl(220,55%,23%)] text-white flex items-center justify-center text-xs font-bold">
              {selectedPatient.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{selectedPatient.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{selectedPatient.uhid} · {getAge(selectedPatient.dob)} {selectedPatient.gender}</p>
            </div>
            <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>
        ) : (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              placeholder="Search by name, UHID, or phone..."
              className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
            />
            {patientResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patientResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                  >
                    <span className="font-medium">{p.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.uhid} · {getAge(p.dob)} {p.gender}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Study selection */}
        <label className="text-xs font-semibold text-foreground mb-1 block">Study / Investigation *</label>
        <input
          value={studyName}
          onChange={e => setStudyName(e.target.value)}
          placeholder="Type study name or select from chips below..."
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-ring outline-none mb-2"
        />

        {/* Quick study chips */}
        <div className="space-y-2 mb-4 max-h-[180px] overflow-y-auto">
          {STUDY_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{group.label}</p>
              <div className="flex flex-wrap gap-1">
                {group.studies.map(s => (
                  <button
                    key={s.name}
                    onClick={() => selectStudyChip(s)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-md border transition-colors",
                      studyName === s.name
                        ? "bg-[hsl(220,80%,96%)] border-[hsl(220,55%,23%)] text-[hsl(220,55%,23%)] font-semibold"
                        : "bg-muted border-border text-foreground/70 hover:bg-[hsl(220,80%,96%)] hover:border-[hsl(220,55%,23%)]"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modality */}
        <label className="text-xs font-semibold text-foreground mb-1 block">Modality</label>
        <select
          value={selectedModalityType}
          onChange={e => setSelectedModalityType(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card mb-3"
        >
          <option value="">Select modality...</option>
          {modalities.map(m => (
            <option key={m.id} value={m.modality_type}>{m.name}</option>
          ))}
          {/* Extra options for modalities not yet in DB */}
          {!modalities.find(m => m.modality_type === "ct") && <option value="ct">CT Scan</option>}
          {!modalities.find(m => m.modality_type === "mri") && <option value="mri">MRI</option>}
          {!modalities.find(m => m.modality_type === "dexa") && <option value="dexa">DEXA</option>}
        </select>

        {/* Body Part */}
        <label className="text-xs font-semibold text-foreground mb-1 block">Body Part</label>
        <input
          value={bodyPart}
          onChange={e => setBodyPart(e.target.value)}
          placeholder="e.g. Chest, Abdomen, Knee"
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card mb-3"
        />

        {/* Priority */}
        <label className="text-xs font-semibold text-foreground mb-1 block">Priority *</label>
        <div className="flex gap-2 mb-3">
          {([
            { key: "routine", label: "🟢 Routine", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { key: "urgent", label: "🟡 Urgent", cls: "bg-amber-50 text-amber-700 border-amber-200" },
            { key: "stat", label: "🔴 STAT", cls: "bg-red-50 text-red-700 border-red-200" },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setPriority(p.key)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                priority === p.key
                  ? p.cls
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Clinical History */}
        <label className="text-xs font-semibold text-foreground mb-1 block">Clinical History / Indication *</label>
        <textarea
          value={clinicalHistory}
          onChange={e => setClinicalHistory(e.target.value)}
          rows={2}
          placeholder="Reason for study, relevant clinical history..."
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card resize-none mb-3"
        />

        {/* PCPNDT toggle - only for USG */}
        {selectedModalityType === "usg" && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPcpndt}
                onChange={e => setIsPcpndt(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium text-foreground">Obstetric / Gynaec USG (PCPNDT applicable)</span>
            </label>
            {isPcpndt && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
                ⚠️ <strong>PCPNDT Act compliance required.</strong> Form F must be completed after the study. Sex determination is strictly prohibited.
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 mt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedPatient || !studyName || !selectedModalityType}
            className="flex-[2] py-3 rounded-lg bg-[hsl(220,55%,23%)] text-white text-sm font-semibold hover:bg-[hsl(220,55%,30%)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {submitting ? "Creating..." : "📋 Create Radiology Order →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRadiologyOrderModal;
