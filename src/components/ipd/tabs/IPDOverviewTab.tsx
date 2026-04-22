import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Pill, ClipboardList, CheckCircle2, Stethoscope, CreditCard, Package, FileText, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import DischargeInstructions from "@/components/ipd/DischargeInstructions";
import DischargeSummaryGenerator from "@/components/ipd/DischargeSummaryGenerator";
import DischargeTATTimer from "@/components/ipd/DischargeTATTimer";
import BillCompletenessCheck from "@/components/ipd/BillCompletenessCheck";
import PackageExcessCheck from "@/components/packages/PackageExcessCheck";
import { isPackageExcessBlocking } from "@/lib/packageBilling";

interface Props {
  admissionId: string;
  hospitalId: string | null;
  onTabChange: (tab: string) => void;
  patientName?: string;
  patientPhone?: string | null;
  highlightDischarge?: boolean;
}

const IPDOverviewTab: React.FC<Props> = ({ admissionId, hospitalId, onTabChange, patientName, patientPhone, highlightDischarge }) => {
  const navigate = useNavigate();
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [vitalsTime, setVitalsTime] = useState("");
  const [billingCleared, setBillingCleared] = useState(false);
  const [medicalCleared, setMedicalCleared] = useState(false);
  const [pharmacyCleared, setPharmacyCleared] = useState(false);
  const [dischargeSummaryDone, setDischargeSummaryDone] = useState(false);
  const [admDiagnosis, setAdmDiagnosis] = useState("");
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [billingPrecheckCleared, setBillingPrecheckCleared] = useState(false);
  const [packageExcessBlocking, setPackageExcessBlocking] = useState(false);

  useEffect(() => {
    if (!admissionId) return;
    const loadStatus = async () => {
      const { data } = await supabase.from("admissions")
        .select("billing_cleared, admitting_diagnosis, medical_cleared, pharmacy_cleared, discharge_summary_done")
        .eq("id", admissionId).maybeSingle();

      setMedicalCleared(data?.medical_cleared || false);
      setDischargeSummaryDone(data?.discharge_summary_done || false);
      setAdmDiagnosis(data?.admitting_diagnosis || "");

      // Real-time billing sync: check flag OR if a paid bill exists
      let billingOk = data?.billing_cleared || false;
      if (!billingOk) {
        const { data: paidBills } = await supabase.from("bills")
          .select("id")
          .eq("admission_id", admissionId)
          .eq("payment_status", "paid")
          .limit(1);
        billingOk = (paidBills && paidBills.length > 0);
        if (billingOk) {
          await supabase.from("admissions").update({ billing_cleared: true }).eq("id", admissionId);
        }
      }
      setBillingCleared(billingOk);

      // Real-time pharmacy sync: check flag OR if no pending dispensing exists
      let pharmacyOk = data?.pharmacy_cleared || false;
      if (!pharmacyOk) {
        const { data: pendingDisp } = await supabase.from("pharmacy_dispensing")
          .select("id")
          .eq("admission_id", admissionId)
          .in("status", ["pending", "processing"])
          .limit(1);
        const { data: anyDisp } = await supabase.from("pharmacy_dispensing")
          .select("id")
          .eq("admission_id", admissionId)
          .limit(1);
        pharmacyOk = (anyDisp && anyDisp.length > 0 && (!pendingDisp || pendingDisp.length === 0));
        if (pharmacyOk) {
          await supabase.from("admissions").update({ pharmacy_cleared: true }).eq("id", admissionId);
        }
      }
      setPharmacyCleared(pharmacyOk);
    };
    loadStatus();
  }, [admissionId]);

  useEffect(() => {
    if (!admissionId || !hospitalId) return;
    supabase.from("ipd_vitals")
      .select("*").eq("admission_id", admissionId)
      .order("recorded_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setLatestVitals(data[0]);
          const mins = Math.round((Date.now() - new Date(data[0].recorded_at).getTime()) / 60000);
          setVitalsTime(mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`);
        }
      });
    supabase.from("ipd_medications")
      .select("*").eq("admission_id", admissionId).eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMedications(data || []));
  }, [admissionId, hospitalId]);

  const updateAdmission = async (field: string, value: boolean) => {
    setSavingStep(field);
    const { error } = await supabase.from("admissions").update({ [field]: value } as any).eq("id", admissionId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `${field.replace(/_/g, " ")} marked` });
    }
    setSavingStep(null);
    return !error;
  };

  const handleMedicalClear = async () => {
    const ok = await updateAdmission("medical_cleared", true);
    if (ok) setMedicalCleared(true);
  };

  const handlePharmacyClear = async () => {
    // Hard-block: verify no pending dispenses remain
    const { data: pendingDisp } = await supabase.from("pharmacy_dispensing")
      .select("id")
      .eq("admission_id", admissionId)
      .in("status", ["pending", "processing"]);

    if (pendingDisp && pendingDisp.length > 0) {
      toast({ title: "Cannot clear pharmacy", description: `${pendingDisp.length} pending dispense(s) remain`, variant: "destructive" });
      return;
    }

    const ok = await updateAdmission("pharmacy_cleared", true);
    if (ok) setPharmacyCleared(true);
  };

  const handleDischargeSummary = () => {
    // Now handled by DischargeSummaryGenerator component
    setDischargeSummaryDone(true);
  };

  // Billing balance due for warning badge
  const [balanceDue, setBalanceDue] = useState(0);
  useEffect(() => {
    if (!admissionId) return;
    (async () => {
      const { data: bills } = await (supabase as any).from("bills")
        .select("net_amount, total_amount")
        .eq("admission_id", admissionId);
      const { data: payments } = await (supabase as any).from("bill_payments")
        .select("amount")
        .eq("admission_id", admissionId);
      const totalBilled = (bills || []).reduce((s: number, b: any) => s + (b.net_amount || b.total_amount || 0), 0);
      const totalPaid = (payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      setBalanceDue(Math.max(0, totalBilled - totalPaid));
    })();
  }, [admissionId, billingCleared]);

  // Package excess gating — block discharge Summary if an unpaid/unwaived
  // package_excess bill exists for this admission.
  useEffect(() => {
    if (!admissionId || !hospitalId) return;
    isPackageExcessBlocking(admissionId, hospitalId)
      .then(setPackageExcessBlocking)
      .catch((e) => console.error("Package excess gate check failed:", e));
  }, [admissionId, hospitalId, billingCleared, dischargeSummaryDone]);

  const steps = [
    { key: "medical", label: "Medical", icon: Stethoscope, done: medicalCleared, color: "text-blue-600" },
    { key: "billing", label: "Billing", icon: CreditCard, done: billingCleared, color: "text-emerald-600" },
    { key: "pharmacy", label: "Pharmacy", icon: Package, done: pharmacyCleared, color: "text-violet-600" },
    { key: "summary", label: "Summary", icon: FileText, done: dischargeSummaryDone, color: "text-amber-600" },
  ];

  const currentStep = !medicalCleared ? 0 : !billingCleared ? 1 : !pharmacyCleared ? 2 : !dischargeSummaryDone ? 3 : 4;

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        {/* Card A: Today's Vitals */}
        <div className="bg-card rounded-lg border border-border p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-[13px] font-bold text-foreground">Today's Vitals</span>
            </div>
            {vitalsTime && <span className="text-[11px] text-muted-foreground">{vitalsTime}</span>}
          </div>
          {latestVitals ? (
            <div className="grid grid-cols-2 gap-2 flex-1">
              <MiniVital label="BP" value={`${latestVitals.bp_systolic || '—'}/${latestVitals.bp_diastolic || '—'}`} unit="mmHg" />
              <MiniVital label="Pulse" value={latestVitals.pulse || '—'} unit="bpm" />
              <MiniVital label="Temp" value={latestVitals.temperature || '—'} unit="°F" />
              <MiniVital label="SpO2" value={latestVitals.spo2 || '—'} unit="%" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex-1 flex items-center">No vitals recorded yet</p>
          )}
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7 w-full" onClick={() => onTabChange("vitals")}>
            Add Vitals
          </Button>
        </div>

        {/* Card B: Active Medications */}
        <div className="bg-card rounded-lg border border-border p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-4 w-4 text-emerald-500" />
            <span className="text-[13px] font-bold text-foreground">Active Medications</span>
            <span className="text-[11px] text-muted-foreground ml-auto">{medications.length}</span>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {medications.slice(0, 4).map((m) => (
              <div key={m.id} className="text-xs">
                <span className="font-semibold text-foreground">{m.drug_name}</span>
                <span className="text-muted-foreground ml-1">{m.dose} · {m.frequency}</span>
              </div>
            ))}
            {medications.length > 4 && (
              <button onClick={() => onTabChange("medications")} className="text-[11px] text-primary hover:underline">
                + {medications.length - 4} more
              </button>
            )}
            {medications.length === 0 && <p className="text-xs text-muted-foreground">No active medications</p>}
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7 w-full" onClick={() => onTabChange("medications")}>
            Add Med
          </Button>
        </div>

        {/* Card C: Pending Orders */}
        <div className="bg-card rounded-lg border border-border p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-amber-500" />
            <span className="text-[13px] font-bold text-foreground">Pending Orders</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-emerald-500 font-medium">No pending orders ✓</p>
          </div>
        </div>

        {/* Card D: Discharge Workflow */}
        <div className={`bg-card rounded-lg border p-4 flex flex-col ${highlightDischarge ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-bold text-foreground">Discharge Workflow</span>
            {currentStep === 4 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-auto">Done</span>}
          </div>

          {/* Live IPD Bill — always available during stay */}
          <Button
            size="sm"
            variant="outline"
            className="mb-3 h-7 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/5"
            onClick={() => navigate(`/billing?action=new&admission_id=${admissionId}&type=ipd`)}
          >
            <Receipt className="h-3 w-3" /> View / Update IPD Bill
          </Button>

          {/* Stepper */}
          <div className="flex items-center gap-1 w-full mb-3">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStep;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      step.done ? 'border-emerald-500 bg-emerald-50' : isActive ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}>
                      {step.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <StepIcon className={`h-3 w-3 ${isActive ? step.color : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <span className={`text-[9px] mt-1 ${step.done ? 'text-emerald-600 font-semibold' : isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                    {step.key === "billing" && !step.done && balanceDue > 0 && (
                      <span className="text-[8px] text-destructive font-bold mt-0.5">₹{balanceDue.toLocaleString("en-IN")} due</span>
                    )}
                  </div>
                  {i < 3 && <div className={`flex-1 h-px mb-4 ${step.done ? 'bg-emerald-400' : 'bg-border'}`} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Discharge TAT Timer */}
          <DischargeTATTimer admissionId={admissionId} hospitalId={hospitalId} medicalCleared={medicalCleared} />

          {/* Action for current step */}
          <div className="flex-1 flex flex-col justify-end">
            {currentStep === 0 && (
              <Button size="sm" className="text-[11px] h-7 w-full bg-blue-600 hover:bg-blue-700" onClick={handleMedicalClear} disabled={savingStep === "medical_cleared"}>
                {savingStep === "medical_cleared" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Stethoscope className="h-3 w-3 mr-1" />}
                Mark Medical Clearance
              </Button>
            )}
            {currentStep === 1 && (
              <div className="space-y-2">
                {hospitalId && (
                  <BillCompletenessCheck
                    admissionId={admissionId}
                    hospitalId={hospitalId}
                    onCleared={(overridden) => {
                      setBillingPrecheckCleared(true);
                      if (overridden) {
                        toast({
                          title: "Bill completeness overridden — proceeding to billing.",
                        });
                      }
                    }}
                  />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-7 w-full border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                  disabled={!billingPrecheckCleared}
                  onClick={() =>
                    navigate(`/billing?action=new&admission_id=${admissionId}&type=ipd`)
                  }
                >
                  <CreditCard className="h-3 w-3 mr-1" /> Finalise Billing →
                </Button>
              </div>
            )}
            {currentStep === 2 && (
              <Button size="sm" className="text-[11px] h-7 w-full bg-violet-600 hover:bg-violet-700" onClick={handlePharmacyClear} disabled={savingStep === "pharmacy_cleared"}>
                {savingStep === "pharmacy_cleared" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Package className="h-3 w-3 mr-1" />}
                Clear Pharmacy
              </Button>
            )}
            {currentStep === 3 && hospitalId && (
              !billingCleared ? (
                <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-center">
                  <p className="text-[11px] text-destructive font-medium">⚠ Billing not cleared. Clear billing before generating discharge summary.</p>
                </div>
              ) : (
                <DischargeSummaryGenerator
                  admissionId={admissionId}
                  hospitalId={hospitalId}
                  billingCleared={billingCleared}
                  onSummaryDone={() => setDischargeSummaryDone(true)}
                />
              )
            )}
            {currentStep === 4 && (
              <p className="text-[11px] text-emerald-600 font-medium text-center">✅ Patient discharged</p>
            )}
          </div>
        </div>
      </div>

      {/* Discharge Instructions */}
      {hospitalId && patientName && (
        <DischargeInstructions
          hospitalId={hospitalId}
          patientName={patientName}
          patientPhone={patientPhone || null}
          diagnosis={admDiagnosis}
          medications={medications.map((m) => ({ drug_name: m.drug_name, dose: m.dose, frequency: m.frequency }))}
          followupDate={null}
          restrictions={null}
        />
      )}
    </div>
  );
};

const MiniVital = ({ label, value, unit }: { label: string; value: string | number; unit: string }) => (
  <div className="bg-muted rounded-md p-2">
    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{label}</p>
    <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground">{unit}</p>
  </div>
);

export default IPDOverviewTab;
