import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BedDouble, ExternalLink, ArrowUpRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { BedData } from "@/pages/ipd/IPDPage";
import IPDOverviewTab from "./tabs/IPDOverviewTab";
import IPDVitalsTab from "./tabs/IPDVitalsTab";
import IPDMedicationsTab from "./tabs/IPDMedicationsTab";
import IPDWardRoundTab from "./tabs/IPDWardRoundTab";
import IPDNotesTab from "./tabs/IPDNotesTab";
import IPDDocumentsTab from "./tabs/IPDDocumentsTab";
import BedTransferModal from "./BedTransferModal";
import { useWhatsAppNotification } from "@/components/whatsapp/WhatsAppNotificationCard";
import { sendDischargeSummaryNotif, sendFeedbackRequest } from "@/lib/whatsapp-notifications";
import { getSpecialtySheet, specialtyTabMeta } from "@/lib/specialtyDetection";
import ObstetricSheet from "@/components/specialty/ObstetricSheet";
import NeonatalSheet from "@/components/specialty/NeonatalSheet";
import AnaesthesiaSheet from "@/components/specialty/AnaesthesiaSheet";
import OphthalmologySheet from "@/components/specialty/OphthalmologySheet";

interface Props {
  bed: BedData | null;
  hospitalId: string | null;
  onRefresh: () => void;
}

export interface PatientDetails {
  id: string;
  full_name: string;
  uhid: string;
  dob: string | null;
  gender: string | null;
  blood_group: string | null;
  phone: string | null;
  allergies: string | null;
  chronic_conditions: string[] | null;
  insurance_id: string | null;
}

const IPDWorkspace: React.FC<Props> = ({ bed, hospitalId, onRefresh }) => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [highlightDischarge, setHighlightDischarge] = useState(false);
  const { show: showWaNotif, card: waCard } = useWhatsAppNotification();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (!bed?.admission) { setDeptName(null); return; }
    const admData = bed.admission as any;
    if (admData.department_id) {
      supabase.from('departments').select('name').eq('id', admData.department_id).maybeSingle()
        .then(({ data }) => setDeptName(data?.name || null));
    } else {
      setDeptName(null);
    }
  }, [bed]);

  const specialty = useMemo(() => getSpecialtySheet(deptName), [deptName]);

  useEffect(() => {
    if (!bed?.admission) { setPatient(null); return; }
    const admissionData = bed.admission as any;
    supabase.from("patients").select("*")
      .eq("id", admissionData.patient_id || "")
      .single()
      .then(({ data }) => {
        if (data) setPatient(data as unknown as PatientDetails);
      });
  }, [bed]);

  if (!bed) {
    return (
      <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center">
        <BedDouble className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-base text-muted-foreground">Click a bed to view patient details</p>
        <p className="text-[13px] text-muted-foreground/60 mt-1">or click an available bed to admit a new patient</p>
      </div>
    );
  }

  if (bed.status === "available") {
    return (
      <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center">
        <BedDouble className="h-10 w-10 text-emerald-400 mb-3" />
        <p className="text-base text-foreground">Bed {bed.bed_number} is available</p>
        <p className="text-[13px] text-muted-foreground mt-2">Click "+ New Admission" to admit a patient</p>
      </div>
    );
  }

  if (bed.status !== "occupied" || !bed.admission) {
    return (
      <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center">
        <BedDouble className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-base text-muted-foreground">Bed {bed.bed_number} — {bed.status}</p>
      </div>
    );
  }

  const adm = bed.admission;
  const admissionId = adm.id;
  const patientAge = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000)
    : null;

  const typeColors: Record<string, string> = {
    elective: "bg-blue-50 text-blue-600",
    emergency: "bg-red-50 text-red-600",
    transfer: "bg-violet-50 text-violet-600",
    daycare: "bg-emerald-50 text-emerald-600",
  };

  const handleInitiateDischarge = () => {
    setActiveTab("overview");
    setHighlightDischarge(true);
    setTimeout(() => setHighlightDischarge(false), 4000);
  };

  const handleEscalate = async () => {
    if (!hospitalId || !patient) return;
    const { error } = await supabase.from("clinical_alerts").insert({
      hospital_id: hospitalId,
      patient_id: patient.id,
      alert_type: "escalation",
      severity: "critical",
      message: `ESCALATION: ${patient.full_name} (Bed ${bed.bed_number}) requires immediate attention`,
      status: "active",
    } as any);
    if (error) {
      toast({ title: "Escalation failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🚨 Escalation alert created", description: `ICU/senior team notified for ${patient.full_name}` });
    }
  };

  return (
    <>
    {waCard}
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
      {/* Patient Header */}
      <div className="flex-shrink-0 h-[72px] bg-card border-b border-border px-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#1A2F5A] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {adm.patient_initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground truncate">{adm.patient_name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {patient?.uhid && <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-px rounded">{patient.uhid}</span>}
            {(adm as any).admission_number && <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-px rounded">{(adm as any).admission_number}</span>}
            {patientAge !== null && patient?.gender && <span className="text-[11px] text-muted-foreground">{patientAge}y · {patient.gender}</span>}
            {patient?.blood_group && <span className="text-[11px] bg-red-50 text-red-600 px-1.5 py-px rounded">{patient.blood_group}</span>}
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-start min-w-0 flex-1">
          {(adm as any).admitting_diagnosis && <p className="text-sm text-muted-foreground italic truncate max-w-full">{(adm as any).admitting_diagnosis}</p>}
          <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-px rounded mt-0.5">Dr. {adm.doctor_name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">Day {adm.los_days}</span>
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", typeColors[adm.admission_type] || "bg-muted text-muted-foreground")}>{adm.admission_type}</span>
        </div>
      </div>

      {/* Tab strip */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex-shrink-0 h-11 w-full justify-start rounded-none bg-card border-b border-border px-2 gap-0">
          {[
            { v: "overview", l: "Overview" },
            { v: "vitals", l: "Vitals" },
            { v: "medications", l: "Medications" },
            { v: "wardround", l: "Ward Round" },
            { v: "notes", l: "Notes" },
            { v: "documents", l: "Documents" },
            ...(specialty ? [{ v: "specialty", l: `${specialtyTabMeta[specialty].icon} ${specialtyTabMeta[specialty].label}` }] : []),
          ].map((t) => (
            <TabsTrigger key={t.v} value={t.v}
              className="text-[13px] rounded-none border-b-2 border-transparent data-[state=active]:border-[#1A2F5A] data-[state=active]:text-[#1A2F5A] data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 h-full"
            >{t.l}</TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="overview" className="h-full m-0">
            <IPDOverviewTab admissionId={admissionId} hospitalId={hospitalId} onTabChange={setActiveTab} patientName={patient?.full_name} patientPhone={patient?.phone} highlightDischarge={highlightDischarge} />
          </TabsContent>
          <TabsContent value="vitals" className="h-full m-0">
            <IPDVitalsTab admissionId={admissionId} hospitalId={hospitalId} userId={userId} />
          </TabsContent>
          <TabsContent value="medications" className="h-full m-0">
            <IPDMedicationsTab admissionId={admissionId} hospitalId={hospitalId} userId={userId} patientAllergies={patient?.allergies ? patient.allergies.split(",").map(a => a.trim()) : []} />
          </TabsContent>
          <TabsContent value="wardround" className="h-full m-0">
            <IPDWardRoundTab admissionId={admissionId} hospitalId={hospitalId} userId={userId} patientId={patient?.id || null} />
          </TabsContent>
          <TabsContent value="notes" className="h-full m-0">
            <IPDNotesTab admissionId={admissionId} hospitalId={hospitalId} userId={userId} />
          </TabsContent>
          <TabsContent value="documents" className="h-full m-0">
            <IPDDocumentsTab admissionId={admissionId} hospitalId={hospitalId} patientId={patient?.id || null} />
          </TabsContent>
          {specialty && hospitalId && patient && (
            <TabsContent value="specialty" className="h-full m-0">
              {specialty === 'obstetric' && <ObstetricSheet patientId={patient.id} hospitalId={hospitalId} admissionId={admissionId} />}
              {specialty === 'neonatal' && <NeonatalSheet patientId={patient.id} hospitalId={hospitalId} admissionId={admissionId} />}
              {specialty === 'anaesthesia' && <AnaesthesiaSheet patientId={patient.id} hospitalId={hospitalId} admissionId={admissionId} />}
              {specialty === 'ophthalmology' && <OphthalmologySheet patientId={patient.id} hospitalId={hospitalId} />}
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* Bottom action bar */}
      <div className="flex-shrink-0 h-14 bg-card border-t border-border px-5 flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setActiveTab("wardround")} className="bg-[#1A2F5A] hover:bg-[#152647] text-xs h-8">
            📝 Ward Round
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("medications")} className="text-xs h-8">
            💊 Add Medication
          </Button>
          {patient && hospitalId && (
            <Button size="sm" variant="outline" className="text-xs h-8 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={async () => {
              const { error } = await supabase.from("physio_referrals").insert({
                hospital_id: hospitalId,
                patient_id: patient.id,
                admission_id: admissionId,
                referred_by: userId || undefined,
                diagnosis: (adm as any).admitting_diagnosis || "Physiotherapy referral",
                goals: [],
                urgency: "routine",
              } as any);
              if (error) { toast({ title: "Referral failed", description: error.message, variant: "destructive" }); return; }
              toast({ title: "↗ Referred to Physiotherapy" });
            }}>
              <ArrowUpRight size={14} className="mr-1" /> Refer Physio
            </Button>
          )}
          {patient && (
            <button onClick={() => navigate(`/patients?id=${patient.id}`)}
              className="flex items-center gap-1 text-[12px] text-primary font-medium hover:underline h-8 px-2">
              View Patient Record <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={handleInitiateDischarge}>
            🏠 Initiate Discharge
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowTransfer(true)}>
            🔁 Transfer
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8 border-red-300 text-red-600 hover:bg-red-50" onClick={handleEscalate}>
            🚨 Escalate
          </Button>
        </div>
      </div>
    </div>

    {/* Transfer Modal */}
    {showTransfer && hospitalId && patient && (
      <BedTransferModal
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        admissionId={admissionId}
        hospitalId={hospitalId}
        currentWardId={(adm as any).ward_id || ""}
        currentBedId={bed.id}
        patientName={patient.full_name}
        onSuccess={onRefresh}
      />
    )}
    </>
  );
};

export default IPDWorkspace;
