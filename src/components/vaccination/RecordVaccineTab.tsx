import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientSearchPicker from "@/components/shared/PatientSearchPicker";
import { ChevronDown, AlertTriangle } from "lucide-react";

interface Props { hospitalId: string; onRecorded: () => void; }

const RecordVaccineTab: React.FC<Props> = ({ hospitalId, onRecorded }) => {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [vaccineId, setVaccineId] = useState("");
  const [doseNumber, setDoseNumber] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [site, setSite] = useState("");
  const [vvmStatus, setVvmStatus] = useState("ok");
  const [aefiReported, setAefiReported] = useState(false);
  const [aefiDesc, setAefiDesc] = useState("");
  const [aefiSeverity, setAefiSeverity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("vaccine_master").select("*").eq("is_active", true).order("vaccine_name")
      .then(({ data }) => setVaccines(data || []));
  }, []);

  useEffect(() => {
    if (vaccineId) {
      const v = vaccines.find((x) => x.id === vaccineId);
      if (v?.site) setSite(v.site);
      // Auto-determine dose
      if (patientId) {
        supabase.from("vaccination_records").select("dose_number")
          .eq("patient_id", patientId).eq("vaccine_id", vaccineId).eq("hospital_id", hospitalId)
          .order("dose_number", { ascending: false }).limit(1)
          .then(({ data }) => setDoseNumber((data?.[0]?.dose_number || 0) + 1));
      }
    }
  }, [vaccineId, patientId]);

  const handleSubmit = async () => {
    if (!patientId || !vaccineId) { toast.error("Select patient and vaccine"); return; }
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const { data: userRow } = await supabase.from("users").select("id").eq("auth_user_id", userId).single();

    const { error } = await supabase.from("vaccination_records").insert({
      hospital_id: hospitalId,
      patient_id: patientId,
      vaccine_id: vaccineId,
      dose_number: doseNumber,
      administered_at: date,
      administered_by: userRow?.id || patientId,
      batch_number: batchNumber || null,
      expiry_date: expiryDate || null,
      site: site || null,
      vvm_status: vvmStatus,
      aefi_reported: aefiReported,
      aefi_description: aefiReported ? aefiDesc : null,
      aefi_severity: aefiReported && aefiSeverity ? aefiSeverity : null,
    });

    if (error) { toast.error("Failed to record: " + error.message); setSaving(false); return; }

    // Update vaccination_due
    await supabase.from("vaccination_due")
      .update({ status: "given" })
      .eq("patient_id", patientId).eq("vaccine_id", vaccineId)
      .eq("dose_number", doseNumber).eq("hospital_id", hospitalId);

    // Deduct stock
    const { data: stock } = await supabase.from("vaccine_stock")
      .select("id, quantity_used").eq("vaccine_id", vaccineId).eq("hospital_id", hospitalId)
      .gt("quantity_balance", 0).order("expiry_date").limit(1);
    if (stock && stock.length > 0) {
      await supabase.from("vaccine_stock").update({ quantity_used: stock[0].quantity_used + 1 }).eq("id", stock[0].id);
    }

    // Auto-schedule next dose for multi-dose vaccines
    const selectedVaccine = vaccines.find((v) => v.id === vaccineId);
    if (selectedVaccine && selectedVaccine.doses > doseNumber) {
      // Fetch patient DOB for next dose calculation
      const { data: patData } = await supabase.from("patients").select("dob").eq("id", patientId).single();
      if (patData?.dob) {
        const nextDoseNum = doseNumber + 1;
        // Check if next dose already exists
        const { data: existing } = await supabase.from("vaccination_due")
          .select("id").eq("patient_id", patientId).eq("vaccine_id", vaccineId)
          .eq("dose_number", nextDoseNum).eq("hospital_id", hospitalId).limit(1);
        if (!existing || existing.length === 0) {
          // Calculate next due date: typically 4 weeks after current dose
          const nextDue = new Date(date);
          nextDue.setDate(nextDue.getDate() + 28);
          await supabase.from("vaccination_due").insert({
            hospital_id: hospitalId,
            patient_id: patientId,
            vaccine_id: vaccineId,
            dose_number: nextDoseNum,
            due_date: nextDue.toISOString().split("T")[0],
            status: "due",
          });
        }
      }
    }

    toast.success(`Vaccination recorded — Dose ${doseNumber}`);
    onRecorded();
    // Reset
    setPatientId(""); setPatientName(""); setVaccineId(""); setBatchNumber(""); setExpiryDate("");
    setAefiReported(false); setAefiDesc(""); setAefiSeverity("");
    setSaving(false);
  };

  return (
    <Card className="p-4 max-w-2xl space-y-4">
      <div>
        <Label className="text-sm font-medium mb-1 block">Patient</Label>
        <PatientSearchPicker hospitalId={hospitalId} value={patientId} selectedLabel={patientName}
          onChange={(id) => { setPatientId(id); }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Vaccine</Label>
          <Select value={vaccineId} onValueChange={setVaccineId}>
            <SelectTrigger><SelectValue placeholder="Select vaccine" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {vaccines.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.vaccine_code} — {v.vaccine_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Dose Number</Label>
          <Input type="number" min={1} value={doseNumber} onChange={(e) => setDoseNumber(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm">Batch Number</Label>
          <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm">Expiry Date</Label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Site</Label>
          <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. Left upper arm" />
        </div>
        <div>
          <Label className="text-sm">VVM Status</Label>
          <Select value={vvmStatus} onValueChange={setVvmStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ok">OK ✅</SelectItem>
              <SelectItem value="stage1">Stage 1</SelectItem>
              <SelectItem value="stage2">Stage 2 ⚠️</SelectItem>
              <SelectItem value="discarded">Discarded ❌</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <AlertTriangle className="h-4 w-4" /> Adverse Event (AEFI) <ChevronDown className="h-3 w-3" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2 pl-2 border-l-2 border-amber-300">
          <div className="flex items-center gap-2">
            <Switch checked={aefiReported} onCheckedChange={setAefiReported} />
            <Label className="text-sm">AEFI observed</Label>
          </div>
          {aefiReported && (
            <>
              <Textarea placeholder="Describe adverse event" value={aefiDesc} onChange={(e) => setAefiDesc(e.target.value)} />
              <Select value={aefiSeverity} onValueChange={setAefiSeverity}>
                <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-600">⚠️ Observe patient for 30 minutes post-vaccination</p>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Button onClick={handleSubmit} disabled={saving} className="w-full">
        {saving ? "Recording..." : "Record Vaccination"}
      </Button>
    </Card>
  );
};

export default RecordVaccineTab;
