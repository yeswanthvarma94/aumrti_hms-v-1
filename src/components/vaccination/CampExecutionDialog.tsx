import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Printer, UserPlus } from "lucide-react";

interface Props {
  hospitalId: string;
  camp: any;
  open: boolean;
  onClose: () => void;
}

const CampExecutionDialog: React.FC<Props> = ({ hospitalId, camp, open, onClose }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);

  // quick-entry fields
  const [pName, setPName] = useState("");
  const [pAge, setPAge] = useState("");
  const [pGender, setPGender] = useState("M");
  const [pPhone, setPPhone] = useState("");
  const [vaccineId, setVaccineId] = useState("");
  const [lot, setLot] = useState("");
  const [doseNo, setDoseNo] = useState("1");
  const [aefi, setAefi] = useState(false);
  const [aefiNotes, setAefiNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !camp) return;
    loadRecords();
    supabase.from("vaccine_master").select("id, vaccine_name, vaccine_code").eq("is_active", true).order("vaccine_name")
      .then(({ data }) => setVaccines(data || []));
  }, [open, camp]);

  const loadRecords = async () => {
    if (!camp) return;
    const { data } = await supabase.from("camp_vaccination_records" as any)
      .select("*").eq("camp_id", camp.id).order("administered_at", { ascending: false });
    setRecords((data as any[]) || []);
  };

  const handleAdd = async () => {
    if (!pName || !vaccineId) { toast.error("Patient name and vaccine required"); return; }
    setSaving(true);
    const v = vaccines.find((x) => x.id === vaccineId);
    const { error } = await supabase.from("camp_vaccination_records" as any).insert({
      hospital_id: hospitalId,
      camp_id: camp.id,
      patient_name: pName,
      patient_age: pAge || null,
      patient_gender: pGender,
      patient_phone: pPhone || null,
      vaccine_id: vaccineId,
      vaccine_name: v?.vaccine_name || "Unknown",
      lot_number: lot || null,
      dose_number: parseInt(doseNo) || 1,
      aefi_occurred: aefi,
      aefi_notes: aefi ? aefiNotes : null,
    });
    if (error) { toast.error("Failed: " + error.message); setSaving(false); return; }
    toast.success("Recorded");
    setPName(""); setPAge(""); setPPhone(""); setLot(""); setDoseNo("1");
    setAefi(false); setAefiNotes("");
    loadRecords();
    setSaving(false);
  };

  const aefiCount = records.filter((r) => r.aefi_occurred).length;
  const totalDoses = records.length;
  const vaccineBreakdown = records.reduce((acc: any, r) => {
    acc[r.vaccine_name] = (acc[r.vaccine_name] || 0) + 1;
    return acc;
  }, {});

  const printCampReport = () => {
    if (!camp) return;
    const breakdown = Object.entries(vaccineBreakdown).map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${v}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>Camp Report ${camp.camp_name}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#0F172A;max-width:800px;margin:0 auto}
h1{text-align:center;font-size:18px;border-bottom:2px solid #1A2F5A;padding-bottom:8px}
.section{margin-top:16px;border:1px solid #E2E8F0;padding:12px;border-radius:6px}
.section h2{font-size:13px;color:#1A2F5A;margin:0 0 8px;text-transform:uppercase}
.row{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin:4px 0}
.label{color:#64748B;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:6px 8px;border:1px solid #E2E8F0;text-align:left}
th{background:#F8FAFC;color:#1A2F5A}
.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}
.kpi-box{background:#F8FAFC;padding:8px;border-radius:4px;text-align:center}
.kpi-num{font-size:20px;font-weight:bold;color:#1A2F5A;font-family:monospace}
.kpi-lbl{font-size:10px;color:#64748B;text-transform:uppercase}
.foot{margin-top:24px;font-size:10px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:8px}
</style></head><body>
<h1>VACCINATION CAMP REPORT</h1>
<p style="font-size:11px;text-align:center;color:#64748B">For Submission to District Health Officer</p>
<div class="section"><h2>Camp Details</h2>
<div class="row"><div><span class="label">Camp Name: </span>${camp.camp_name}</div>
<div><span class="label">Date: </span>${new Date(camp.camp_date).toLocaleDateString("en-IN")}</div></div>
<div class="row"><div><span class="label">Location: </span>${camp.location}</div>
<div><span class="label">Target: </span>${camp.target_population || "—"}</div></div>
</div>
<div class="section"><h2>Summary</h2>
<div class="kpi">
<div class="kpi-box"><div class="kpi-num">${totalDoses}</div><div class="kpi-lbl">Total Administered</div></div>
<div class="kpi-box"><div class="kpi-num">${camp.target_count || "—"}</div><div class="kpi-lbl">Target Count</div></div>
<div class="kpi-box"><div class="kpi-num" style="color:#EF4444">${aefiCount}</div><div class="kpi-lbl">AEFI Events</div></div>
</div>
</div>
<div class="section"><h2>Vaccine Breakdown</h2>
<table><thead><tr><th>Vaccine</th><th style="text-align:right">Doses</th></tr></thead>
<tbody>${breakdown || '<tr><td colspan="2" style="text-align:center;color:#94A3B8">No records</td></tr>'}</tbody></table>
</div>
${aefiCount > 0 ? `<div class="section"><h2>AEFI Events During Camp</h2>
<table><thead><tr><th>Patient</th><th>Vaccine</th><th>Notes</th></tr></thead>
<tbody>${records.filter(r => r.aefi_occurred).map(r => `<tr><td>${r.patient_name}</td><td>${r.vaccine_name}</td><td>${r.aefi_notes || "—"}</td></tr>`).join("")}</tbody></table>
</div>` : ""}
<div class="foot">Generated ${new Date().toLocaleString("en-IN")} • Aumrti HMS</div>
<script>window.onload=()=>{window.print();}</script></body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (!camp) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{camp.camp_name} — {new Date(camp.camp_date).toLocaleDateString("en-IN")}</span>
            <Button size="sm" variant="outline" onClick={printCampReport}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Camp Report
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="border rounded p-2 text-center">
            <p className="text-xs text-muted-foreground">Administered</p>
            <p className="text-lg font-bold font-mono">{totalDoses}</p>
          </div>
          <div className="border rounded p-2 text-center">
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-lg font-bold font-mono">{camp.target_count || "—"}</p>
          </div>
          <div className="border rounded p-2 text-center">
            <p className="text-xs text-muted-foreground">AEFI Events</p>
            <p className="text-lg font-bold font-mono text-destructive">{aefiCount}</p>
          </div>
        </div>

        {/* Quick Entry */}
        <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" /> Quick Entry
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Patient name" value={pName} onChange={(e) => setPName(e.target.value)} />
            <Input placeholder="Age" value={pAge} onChange={(e) => setPAge(e.target.value)} />
            <Select value={pGender} onValueChange={setPGender}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Phone (opt)" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={vaccineId} onValueChange={setVaccineId}>
              <SelectTrigger><SelectValue placeholder="Vaccine" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {vaccines.map((v) => <SelectItem key={v.id} value={v.id}>{v.vaccine_code} — {v.vaccine_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Lot/Batch number" value={lot} onChange={(e) => setLot(e.target.value)} />
            <Input type="number" placeholder="Dose #" value={doseNo} onChange={(e) => setDoseNo(e.target.value)} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="aefi-cb" checked={aefi} onCheckedChange={(c) => setAefi(!!c)} />
            <div className="flex-1">
              <Label htmlFor="aefi-cb" className="text-xs">AEFI occurred during/after vaccination</Label>
              {aefi && <Textarea className="mt-1" rows={2} placeholder="AEFI notes" value={aefiNotes} onChange={(e) => setAefiNotes(e.target.value)} />}
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving} className="w-full">
            {saving ? "Saving..." : "+ Add Record"}
          </Button>
        </div>

        {/* Records */}
        <div className="border rounded-lg overflow-auto max-h-80 mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Age/Sex</TableHead>
                <TableHead>Vaccine</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Dose</TableHead>
                <TableHead>AEFI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{new Date(r.administered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell className="text-sm">{r.patient_name}</TableCell>
                  <TableCell className="text-xs">{r.patient_age || "—"}/{r.patient_gender || "—"}</TableCell>
                  <TableCell className="text-xs">{r.vaccine_name}</TableCell>
                  <TableCell className="text-xs font-mono">{r.lot_number || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{r.dose_number}</TableCell>
                  <TableCell>{r.aefi_occurred ? <Badge variant="destructive" className="text-[9px]">AEFI</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">No records yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampExecutionDialog;
