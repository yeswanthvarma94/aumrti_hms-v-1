import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Stethoscope, Mic, Save, CheckCircle, FlaskConical, Building2, Smartphone } from "lucide-react";
import type { OpdToken } from "@/pages/opd/OPDPage";
import VoiceDictationButton from "@/components/voice/VoiceDictationButton";
import { useVoiceScribe } from "@/contexts/VoiceScribeContext";
import ComplaintTab from "./tabs/ComplaintTab";
import VitalsTab from "./tabs/VitalsTab";
import ExaminationTab from "./tabs/ExaminationTab";
import RxOrdersTab from "./tabs/RxOrdersTab";
import HistoryTab from "./tabs/HistoryTab";

interface Props {
  token: OpdToken | null;
  hospitalId: string | null;
  userId: string | null;
  onTokenUpdate: () => void;
}

export interface EncounterData {
  id?: string;
  chief_complaint: string;
  history_of_present_illness: string;
  vitals: Record<string, unknown>;
  examination_notes: string;
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
  diagnosis: string;
  icd10_code: string;
  follow_up_date: string;
  follow_up_notes: string;
}

export interface PrescriptionData {
  id?: string;
  drugs: DrugEntry[];
  lab_orders: LabOrder[];
  radiology_orders: RadiologyOrder[];
  advice_notes: string;
  review_date: string;
  is_signed: boolean;
}

export interface DrugEntry {
  drug_name: string;
  dose: string;
  route: string;
  frequency: string;
  duration_days: string;
  instructions: string;
  quantity: string;
  is_stat: boolean;
  is_ndps?: boolean;
}

export interface LabOrder {
  test_name: string;
  urgency: string;
  clinical_indication: string;
}

export interface RadiologyOrder {
  study_name: string;
  urgency: string;
  clinical_indication: string;
}

const emptyEncounter: EncounterData = {
  chief_complaint: "", history_of_present_illness: "", vitals: {},
  examination_notes: "", soap_subjective: "", soap_objective: "",
  soap_assessment: "", soap_plan: "", diagnosis: "", icd10_code: "",
  follow_up_date: "", follow_up_notes: "",
};

const emptyPrescription: PrescriptionData = {
  drugs: [], lab_orders: [], radiology_orders: [],
  advice_notes: "", review_date: "", is_signed: false,
};

const TABS = ["Complaint", "Vitals", "Examination", "Rx & Orders", "History"] as const;

const ConsultationWorkspace: React.FC<Props> = ({ token, hospitalId, userId, onTokenUpdate }) => {
  const { toast } = useToast();
  const { registerScreen, unregisterScreen } = useVoiceScribe();
  const [activeTab, setActiveTab] = useState(0);
  const [encounter, setEncounter] = useState<EncounterData>(emptyEncounter);
  const [prescription, setPrescription] = useState<PrescriptionData>(emptyPrescription);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const prevTokenId = useRef<string | null>(null);
  const encounterRef = useRef(encounter);
  const prescriptionRef = useRef(prescription);
  encounterRef.current = encounter;
  prescriptionRef.current = prescription;

  // Register fill function for voice scribe
  useEffect(() => {
    const fillFn = (data: Record<string, unknown>) => {
      const enc = encounterRef.current;
      const rx = prescriptionRef.current;
      // Fill encounter fields
      setEncounter((prev) => ({
        ...prev,
        chief_complaint: (data.chief_complaint as string) || prev.chief_complaint,
        history_of_present_illness: (data.history_of_present_illness as string) || prev.history_of_present_illness,
        examination_notes: (data.examination_findings as string) || prev.examination_notes,
        diagnosis: (data.diagnosis as string) || prev.diagnosis,
        icd10_code: (data.icd_suggestion as string) || prev.icd10_code,
        soap_plan: (data.plan as string) || prev.soap_plan,
        follow_up_notes: (data.follow_up as string) || prev.follow_up_notes,
      }));
      // Fill prescription
      const drugs = ((data.prescription as DrugEntry[]) || []).map((d) => ({
        drug_name: d.drug_name || "",
        dose: d.dose || "",
        route: d.route || "Oral",
        frequency: d.frequency || "OD",
        duration_days: (d as unknown as Record<string, string>).duration || "",
        instructions: d.instructions || "",
        quantity: "",
        is_stat: false,
      }));
      const labOrders = ((data.investigations as string[]) || []).map((name) => ({
        test_name: name, urgency: "routine", clinical_indication: "",
      }));
      if (drugs.length > 0 || labOrders.length > 0) {
        setPrescription((prev) => ({
          ...prev,
          drugs: [...prev.drugs, ...drugs],
          lab_orders: [...prev.lab_orders, ...labOrders],
          advice_notes: (data.follow_up as string) || prev.advice_notes,
        }));
      }
    };
    registerScreen("opd_consultation", fillFn);
    return () => unregisterScreen("opd_consultation");
  }, [registerScreen, unregisterScreen]);

  // Load encounter when token changes
  useEffect(() => {
    if (!token || !hospitalId || !userId) {
      setEncounter(emptyEncounter);
      setPrescription(emptyPrescription);
      setEncounterId(null);
      setPrescriptionId(null);
      return;
    }
    if (token.id === prevTokenId.current) return;
    prevTokenId.current = token.id;

    (async () => {
      // Fetch existing encounter for this token
      const { data: enc } = await supabase
        .from("opd_encounters")
        .select("*")
        .eq("token_id", token.id)
        .maybeSingle();

      if (enc) {
        setEncounterId(enc.id);
        setEncounter({
          chief_complaint: enc.chief_complaint || "",
          history_of_present_illness: enc.history_of_present_illness || "",
          vitals: (enc.vitals as Record<string, unknown>) || {},
          examination_notes: enc.examination_notes || "",
          soap_subjective: enc.soap_subjective || "",
          soap_objective: enc.soap_objective || "",
          soap_assessment: enc.soap_assessment || "",
          soap_plan: enc.soap_plan || "",
          diagnosis: enc.diagnosis || "",
          icd10_code: enc.icd10_code || "",
          follow_up_date: enc.follow_up_date || "",
          follow_up_notes: enc.follow_up_notes || "",
        });

        // Fetch prescription
        const { data: rx } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("encounter_id", enc.id)
          .maybeSingle();
        if (rx) {
          setPrescriptionId(rx.id);
          setPrescription({
            drugs: (rx.drugs as unknown as DrugEntry[]) || [],
            lab_orders: (rx.lab_orders as unknown as LabOrder[]) || [],
            radiology_orders: (rx.radiology_orders as unknown as RadiologyOrder[]) || [],
            advice_notes: rx.advice_notes || "",
            review_date: rx.review_date || "",
            is_signed: rx.is_signed || false,
          });
        } else {
          setPrescription(emptyPrescription);
          setPrescriptionId(null);
        }
      } else {
        setEncounter(emptyEncounter);
        setPrescription(emptyPrescription);
        setEncounterId(null);
        setPrescriptionId(null);
      }
    })();
  }, [token, hospitalId, userId]);

  // Auto-save encounter
  const autoSaveEncounter = useCallback(async (data: EncounterData) => {
    if (!token || !hospitalId || !userId) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        hospital_id: hospitalId,
        token_id: token.id,
        patient_id: token.patient_id,
        doctor_id: userId,
        visit_date: new Date().toISOString().split("T")[0],
        chief_complaint: data.chief_complaint || null,
        history_of_present_illness: data.history_of_present_illness || null,
        vitals: data.vitals as unknown as import("@/integrations/supabase/types").Json,
        examination_notes: data.examination_notes || null,
        soap_subjective: data.soap_subjective || null,
        soap_objective: data.soap_objective || null,
        soap_assessment: data.soap_assessment || null,
        soap_plan: data.soap_plan || null,
        diagnosis: data.diagnosis || null,
        icd10_code: data.icd10_code || null,
        follow_up_date: data.follow_up_date || null,
        follow_up_notes: data.follow_up_notes || null,
        updated_at: new Date().toISOString(),
      };

      if (encounterId) {
        await supabase.from("opd_encounters").update(payload as never).eq("id", encounterId);
      } else {
        const { data: newEnc } = await supabase.from("opd_encounters").insert([payload] as never).select("id").single();
        if (newEnc) setEncounterId(newEnc.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setSaving(false);
    }
  }, [token, hospitalId, userId, encounterId]);

  // Auto-save prescription
  const autoSavePrescription = useCallback(async (data: PrescriptionData) => {
    if (!token || !hospitalId || !userId || !encounterId) return;
    try {
      const payload = {
        hospital_id: hospitalId,
        encounter_id: encounterId,
        patient_id: token.patient_id,
        doctor_id: userId,
        prescription_date: new Date().toISOString().split("T")[0],
        drugs: JSON.parse(JSON.stringify(data.drugs)),
        lab_orders: JSON.parse(JSON.stringify(data.lab_orders)),
        radiology_orders: JSON.parse(JSON.stringify(data.radiology_orders)),
        advice_notes: data.advice_notes || null,
        review_date: data.review_date || null,
      };

      if (prescriptionId) {
        await supabase.from("prescriptions").update(payload as never).eq("id", prescriptionId);
      } else {
        const { data: newRx } = await supabase.from("prescriptions").insert([payload] as never).select("id").single();
        if (newRx) setPrescriptionId(newRx.id);
      }
    } catch (err) {
      console.error("Prescription save error:", err);
    }
  }, [token, hospitalId, userId, encounterId, prescriptionId]);

  // Debounced update
  const updateEncounter = useCallback((partial: Partial<EncounterData>) => {
    setEncounter((prev) => {
      const next = { ...prev, ...partial };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => autoSaveEncounter(next), 2000);
      return next;
    });
  }, [autoSaveEncounter]);

  const updatePrescription = useCallback((partial: Partial<PrescriptionData>) => {
    setPrescription((prev) => {
      const next = { ...prev, ...partial };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        autoSaveEncounter(encounter);
        autoSavePrescription(next);
      }, 2000);
      return next;
    });
  }, [autoSaveEncounter, autoSavePrescription, encounter]);

  const handleStartConsultation = async () => {
    if (!token) return;
    await supabase.from("opd_tokens").update({
      status: "in_consultation",
      called_at: new Date().toISOString(),
      consultation_start_at: new Date().toISOString(),
    }).eq("id", token.id);
    onTokenUpdate();
  };

  const handleComplete = async () => {
    if (!token) return;
    if (!encounter.chief_complaint.trim()) {
      toast({ title: "Chief complaint is required", variant: "destructive" });
      return;
    }
    await autoSaveEncounter(encounter);
    if (encounterId) await autoSavePrescription(prescription);
    await supabase.from("opd_tokens").update({
      status: "completed",
      consultation_end_at: new Date().toISOString(),
    }).eq("id", token.id);
    onTokenUpdate();
    toast({ title: "Encounter saved. Billing module coming in Phase 6." });
  };

  const handleSendWhatsApp = () => {
    if (!token?.patient?.phone) {
      toast({ title: "Patient phone number not available", variant: "destructive" });
      return;
    }
    const phone = token.patient.phone.replace(/\D/g, "");
    const drugList = prescription.drugs.map((d) => `• ${d.drug_name} - ${d.dose} - ${d.frequency} - ${d.duration_days} days`).join("\n");
    const labList = prescription.lab_orders.map((l) => l.test_name).join(", ");
    const msg = `🏥 *Prescription*\n*Patient:* ${token.patient.full_name}\n📅 ${new Date().toLocaleDateString("en-IN")}\n\n💊 *Medicines:*\n${drugList || "None"}\n\n🔬 *Lab Tests:* ${labList || "None"}\n\n📋 *Advice:* ${prescription.advice_notes || "—"}\n📅 *Review:* ${prescription.review_date || "As needed"}`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`);
    if (prescriptionId) {
      supabase.from("prescriptions").update({ whatsapp_sent: true }).eq("id", prescriptionId);
    }
  };

  if (!token) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
        <Stethoscope className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-base text-slate-400">Select a patient from the queue</p>
        <p className="text-[13px] text-slate-300 mt-1">or register a walk-in to begin</p>
      </div>
    );
  }

  const initials = (token.patient?.full_name || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const patientAge = token.patient?.dob
    ? Math.floor((Date.now() - new Date(token.patient.dob).getTime()) / 31557600000)
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Patient header bar */}
      <div className="flex-shrink-0 h-[60px] bg-white border-b border-slate-200 px-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#1A2F5A] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900 truncate">{token.patient?.full_name}</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-slate-100 text-slate-600 px-1.5 py-px rounded">{token.patient?.uhid}</span>
            {patientAge !== null && <span className="text-slate-500">{patientAge}y · {token.patient?.gender || "—"}</span>}
            {token.patient?.blood_group && (
              <span className="bg-red-50 text-red-600 px-1.5 py-px rounded text-[10px]">{token.patient.blood_group}</span>
            )}
          </div>
        </div>

        {/* Allergies */}
        <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0 px-2">
          {token.patient?.allergies ? (
            <>
              <span className="text-[10px] font-bold text-red-600">⚠️ Allergies:</span>
              {token.patient.allergies.split(",").map((a, i) => (
                <span key={i} className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-px">{a.trim()}</span>
              ))}
            </>
          ) : (
            <span className="text-[11px] text-slate-400">+ Add allergy</span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs bg-blue-50 text-[#1A2F5A] px-2 py-0.5 rounded font-medium">{token.token_number}</span>
          {token.status === "waiting" && (
            <button onClick={handleStartConsultation} className="text-xs bg-[#1A2F5A] text-white px-3 py-1.5 rounded-md font-semibold hover:bg-[#152647] active:scale-[0.97] transition-all">
              ▶ Start Consultation
            </button>
          )}
          {token.status === "in_consultation" && (
            <button onClick={handleComplete} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-emerald-600 active:scale-[0.97] transition-all">
              ✓ Complete
            </button>
          )}
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex-shrink-0 h-12 bg-white border-b border-slate-200 flex">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              "px-5 h-full text-[13px] border-b-2 transition-colors",
              activeTab === i
                ? "border-[#1A2F5A] text-[#1A2F5A] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
        {/* Save indicator */}
        <div className="ml-auto flex items-center pr-4 gap-1">
          {saving && <span className="text-[11px] text-slate-400">Saving...</span>}
          {saved && <span className="text-[11px] text-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Saved</span>}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 0 && <ComplaintTab encounter={encounter} onChange={updateEncounter} />}
        {activeTab === 1 && <VitalsTab encounter={encounter} onChange={updateEncounter} />}
        {activeTab === 2 && <ExaminationTab encounter={encounter} onChange={updateEncounter} />}
        {activeTab === 3 && <RxOrdersTab prescription={prescription} onChange={updatePrescription} hospitalId={hospitalId} patientAllergies={token?.patient?.allergies ? token.patient.allergies.split(",").map(a => a.trim()) : []} />}
        {activeTab === 4 && <HistoryTab token={token} encounterId={encounterId} />}
      </div>

      {/* Bottom action bar */}
      <div className="flex-shrink-0 h-14 bg-white border-t border-slate-200 px-4 flex items-center gap-2">
        <button onClick={() => autoSaveEncounter(encounter)} className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-1.5 active:scale-[0.97] transition-all">
          <Save className="h-3.5 w-3.5" /> Save Draft
        </button>
        <button onClick={handleComplete} className="text-xs bg-[#1A2F5A] text-white px-4 py-1.5 rounded-md font-semibold hover:bg-[#152647] flex items-center gap-1.5 active:scale-[0.97] transition-all">
          <CheckCircle className="h-3.5 w-3.5" /> Complete & Bill
        </button>
        <VoiceDictationButton sessionType="opd_consultation" size="sm" />
        <div className="flex-1" />
        <button onClick={() => setActiveTab(3)} className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-1.5 active:scale-[0.97] transition-all">
          <FlaskConical className="h-3.5 w-3.5" /> Order Lab
        </button>
        <button onClick={() => toast({ title: "IPD admission available after Phase 3 IPD build" })} className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-1.5 active:scale-[0.97] transition-all">
          <Building2 className="h-3.5 w-3.5" /> Admit
        </button>
        <button onClick={handleSendWhatsApp} className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-1.5 active:scale-[0.97] transition-all">
          <Smartphone className="h-3.5 w-3.5" /> Send Rx
        </button>
      </div>
    </div>
  );
};

export default ConsultationWorkspace;
