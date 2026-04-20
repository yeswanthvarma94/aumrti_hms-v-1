import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientSearchPicker from "@/components/shared/PatientSearchPicker";
import { AlertTriangle, FileText, Printer } from "lucide-react";

interface Props { hospitalId: string; }

const EVENT_TYPES = {
  mild: ["Injection site reaction", "Injection site abscess", "Lymphadenitis", "Fever ≥38°C", "Irritability", "Rash"],
  moderate: ["Persistent fever >24h", "Severe local swelling", "Vomiting", "Diarrhoea"],
  severe: ["Anaphylaxis", "Encephalopathy", "Persistent crying >3 hours", "Convulsions", "Hospitalisation", "Death"],
};

const AefiTab: React.FC<Props> = ({ hospitalId }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [vaccinationRecords, setVaccinationRecords] = useState<any[]>([]);
  const [vaccinationRecordId, setVaccinationRecordId] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [doseNumber, setDoseNumber] = useState("");
  const [vaccinatedAt, setVaccinatedAt] = useState("");
  const [onsetHours, setOnsetHours] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("recovering");
  const [treatment, setTreatment] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [reportedTo, setReportedTo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const { data } = await supabase.from("aefi_reports" as any)
      .select("*").eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false }).limit(100);
    setReports((data as any[]) || []);
  };

  useEffect(() => {
    if (!patientId) { setVaccinationRecords([]); return; }
    supabase.from("vaccination_records")
      .select("id, dose_number, administered_at, vaccine_master(vaccine_name, vaccine_code)")
      .eq("patient_id", patientId).eq("hospital_id", hospitalId)
      .order("administered_at", { ascending: false }).limit(20)
      .then(({ data }) => setVaccinationRecords(data || []));
  }, [patientId, hospitalId]);

  const handleSelectVaccination = (id: string) => {
    setVaccinationRecordId(id);
    const r = vaccinationRecords.find((v) => v.id === id);
    if (r) {
      setVaccineName((r as any).vaccine_master?.vaccine_name || "");
      setDoseNumber(String(r.dose_number || ""));
      setVaccinatedAt(r.administered_at ? new Date(r.administered_at).toISOString().slice(0, 16) : "");
    }
  };

  const handleSave = async () => {
    if (!patientId || !vaccineName || !eventType) {
      toast.error("Patient, vaccine, and event type are required"); return;
    }
    setSaving(true);
    const { error } = await supabase.from("aefi_reports" as any).insert({
      hospital_id: hospitalId,
      patient_id: patientId,
      vaccination_record_id: vaccinationRecordId || null,
      vaccine_name: vaccineName,
      dose_number: doseNumber ? parseInt(doseNumber) : null,
      vaccinated_at: vaccinatedAt || null,
      event_onset_hours: onsetHours ? parseInt(onsetHours) : null,
      event_type: eventType,
      event_severity: severity,
      event_description: description || null,
      outcome,
      treatment_given: treatment || null,
      reported_by: reportedBy || null,
      reported_to: reportedTo || null,
    });
    if (error) { toast.error("Failed: " + error.message); setSaving(false); return; }
    toast.success("AEFI report submitted");
    setShowAdd(false);
    setPatientId(""); setPatientLabel(""); setVaccinationRecordId("");
    setVaccineName(""); setDoseNumber(""); setVaccinatedAt("");
    setOnsetHours(""); setEventType(""); setDescription("");
    setTreatment(""); setReportedBy(""); setReportedTo("");
    loadReports();
    setSaving(false);
  };

  const printReport = (r: any) => {
    const html = `<!DOCTYPE html><html><head><title>AEFI Report ${r.id.slice(0, 8)}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#0F172A;max-width:800px;margin:0 auto}
h1{text-align:center;font-size:18px;border-bottom:2px solid #1A2F5A;padding-bottom:8px}
.section{margin-top:16px;border:1px solid #E2E8F0;padding:12px;border-radius:6px}
.section h2{font-size:13px;color:#1A2F5A;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin:4px 0}
.label{color:#64748B;font-weight:600}.val{color:#0F172A}
.severe{color:#EF4444;font-weight:bold}.foot{margin-top:24px;font-size:10px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:8px}
</style></head><body>
<h1>ADVERSE EVENT FOLLOWING IMMUNISATION (AEFI) REPORT</h1>
<p style="font-size:11px;text-align:center;color:#64748B">National AEFI Surveillance System — India</p>
<div class="section"><h2>Vaccine Details</h2>
<div class="row"><div><span class="label">Vaccine: </span><span class="val">${r.vaccine_name}</span></div>
<div><span class="label">Dose No.: </span><span class="val">${r.dose_number || "—"}</span></div></div>
<div class="row"><div><span class="label">Vaccinated at: </span><span class="val">${r.vaccinated_at ? new Date(r.vaccinated_at).toLocaleString("en-IN") : "—"}</span></div>
<div><span class="label">Onset: </span><span class="val">${r.event_onset_hours || "—"} hours after</span></div></div>
</div>
<div class="section"><h2>Adverse Event</h2>
<div class="row"><div><span class="label">Event type: </span><span class="val">${r.event_type}</span></div>
<div><span class="label">Severity: </span><span class="val ${r.event_severity === "severe" ? "severe" : ""}">${r.event_severity?.toUpperCase()}</span></div></div>
<div style="margin-top:8px;font-size:12px"><span class="label">Description: </span>${r.event_description || "—"}</div>
<div style="margin-top:8px;font-size:12px"><span class="label">Outcome: </span><b>${r.outcome || "—"}</b></div>
<div style="margin-top:8px;font-size:12px"><span class="label">Treatment given: </span>${r.treatment_given || "—"}</div>
</div>
<div class="section"><h2>Reporting</h2>
<div class="row"><div><span class="label">Reported by: </span><span class="val">${r.reported_by || "—"}</span></div>
<div><span class="label">Reported to: </span><span class="val">${r.reported_to || "—"}</span></div></div>
<div class="row"><div><span class="label">Report date: </span><span class="val">${r.report_date ? new Date(r.report_date).toLocaleDateString("en-IN") : "—"}</span></div>
<div><span class="label">Status: </span><span class="val">${r.status}</span></div></div>
</div>
<div class="foot">Generated ${new Date().toLocaleString("en-IN")} • Aumrti HMS</div>
<script>window.onload=()=>{window.print();}</script></body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const sevColor = (s: string) => s === "severe" ? "destructive" : s === "moderate" ? "secondary" : "outline";

  return (
    <div className="space-y-3 pb-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            AEFI Reports
          </h3>
          <p className="text-xs text-muted-foreground">Adverse Events Following Immunisation — National Surveillance</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Report AEFI</Button>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[calc(100vh-340px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vaccine</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Onset</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.report_date).toLocaleDateString("en-IN")}</TableCell>
                <TableCell className="text-sm font-medium">{r.vaccine_name}</TableCell>
                <TableCell className="text-xs">{r.event_type}</TableCell>
                <TableCell><Badge variant={sevColor(r.event_severity)} className="text-xs capitalize">{r.event_severity}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{r.event_onset_hours ? `${r.event_onset_hours}h` : "—"}</TableCell>
                <TableCell className="text-xs capitalize">{r.outcome}</TableCell>
                <TableCell className="text-xs">{r.reported_by || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => printReport(r)}>
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No AEFI reports filed</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Report Adverse Event Following Immunisation
          </DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Patient</Label>
              <PatientSearchPicker
                hospitalId={hospitalId}
                value={patientId}
                selectedLabel={patientLabel}
                onChange={async (id) => {
                  setPatientId(id);
                  if (id) {
                    const { data } = await supabase.from("patients").select("full_name, uhid").eq("id", id).maybeSingle();
                    if (data) setPatientLabel(`${data.full_name} (${data.uhid})`);
                  } else {
                    setPatientLabel("");
                  }
                }}
              />
            </div>

            {vaccinationRecords.length > 0 && (
              <div>
                <Label className="text-sm">Link to Vaccination Record (optional)</Label>
                <Select value={vaccinationRecordId} onValueChange={handleSelectVaccination}>
                  <SelectTrigger><SelectValue placeholder="Select vaccination record" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {vaccinationRecords.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.vaccine_master?.vaccine_code} — Dose {v.dose_number} ({new Date(v.administered_at).toLocaleDateString("en-IN")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Vaccine Name *</Label>
                <Input value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Dose Number</Label>
                <Input type="number" value={doseNumber} onChange={(e) => setDoseNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Vaccinated At</Label>
                <Input type="datetime-local" value={vaccinatedAt} onChange={(e) => setVaccinatedAt(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Onset (hours after vaccination)</Label>
                <Select value={onsetHours} onValueChange={setOnsetHours}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">0–24 hours</SelectItem>
                    <SelectItem value="48">24–72 hours</SelectItem>
                    <SelectItem value="120">More than 72 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Severity *</Label>
                <Select value={severity} onValueChange={(v) => { setSeverity(v); setEventType(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Event Type *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                  <SelectContent>
                    {(EVENT_TYPES as any)[severity].map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm">Event Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recovering">Recovering</SelectItem>
                    <SelectItem value="recovered">Recovered</SelectItem>
                    <SelectItem value="hospitalised">Hospitalised</SelectItem>
                    <SelectItem value="died">Died</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Treatment Given</Label>
                <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. Paracetamol, IV fluids" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Reported By (Name, Designation)</Label>
                <Input value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Reported To</Label>
                <Select value={reportedTo} onValueChange={setReportedTo}>
                  <SelectTrigger><SelectValue placeholder="Select authority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHC">PHC (Primary Health Centre)</SelectItem>
                    <SelectItem value="CHC">CHC (Community Health Centre)</SelectItem>
                    <SelectItem value="District AEFI Committee">District AEFI Committee</SelectItem>
                    <SelectItem value="State AEFI Committee">State AEFI Committee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <FileText className="h-4 w-4 mr-1" />
              {saving ? "Submitting..." : "Submit AEFI Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AefiTab;
