import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  showCreate: boolean;
  onCloseCreate: () => void;
}

const mannerOptions = ["natural", "accident", "suicide", "homicide", "undetermined"];

const DeathCertificatesTab: React.FC<Props> = ({ showCreate, onCloseCreate }) => {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);

  // Form
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [timeOfDeath, setTimeOfDeath] = useState("");
  const [cause1a, setCause1a] = useState("");
  const [cause1b, setCause1b] = useState("");
  const [cause1c, setCause1c] = useState("");
  const [cause2, setCause2] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [manner, setManner] = useState("natural");
  const [isMlc, setIsMlc] = useState(false);
  const [certifiedBy, setCertifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userData } = await (supabase as any).from("users").select("id, hospital_id").eq("auth_user_id", user.id).single();
    if (!userData) return;
    setHospitalId(userData.hospital_id);
    fetchCerts(userData.hospital_id);
    const { data: docs } = await (supabase as any).from("users").select("id, full_name").eq("hospital_id", userData.hospital_id).eq("role", "doctor").eq("is_active", true);
    setDoctors(docs || []);
  };

  const fetchCerts = async (hid: string) => {
    setLoading(true);
    const { data } = await (supabase as any).from("death_certificates").select("*, patients(full_name, uhid)").eq("hospital_id", hid).order("created_at", { ascending: false });
    setCerts(data || []);
    setLoading(false);
  };

  const searchPatients = async (q: string) => {
    setPatientSearch(q);
    if (q.length < 2) { setPatients([]); return; }
    const { data } = await (supabase as any).from("patients").select("id, full_name, uhid").eq("hospital_id", hospitalId).or(`full_name.ilike.%${q}%,uhid.ilike.%${q}%`).limit(10);
    setPatients(data || []);
  };

  const createCert = async () => {
    if (!patientId || !timeOfDeath || !cause1a || !certifiedBy) { toast.error("Fill all required fields"); return; }
    setSaving(true);
    const mccdNum = `MCCD-${Date.now()}`;
    const { error } = await (supabase as any).from("death_certificates").insert({
      hospital_id: hospitalId,
      patient_id: patientId,
      time_of_death: timeOfDeath,
      cause_1a: cause1a,
      cause_1b: cause1b || null,
      cause_1c: cause1c || null,
      cause_2: cause2 || null,
      icd_code: icdCode || null,
      manner_of_death: manner,
      is_mlc: isMlc,
      certified_by: certifiedBy,
      mccd_form_number: mccdNum,
      issued_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Death certificate created");
    setSaving(false);
    onCloseCreate();
    setPatientId(""); setCause1a(""); setCause1b(""); setCause1c(""); setCause2(""); setIcdCode("");
    setPatientSearch(""); setTimeOfDeath(""); setManner("natural"); setIsMlc(false); setCertifiedBy("");
    fetchCerts(hospitalId);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Time of Death</TableHead>
                <TableHead>Cause (1a)</TableHead>
                <TableHead>Manner</TableHead>
                <TableHead>MLC</TableHead>
                <TableHead>MCCD #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : certs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No death certificates</TableCell></TableRow>
              ) : certs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="text-[13px] font-medium">{c.patients?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{c.patients?.uhid}</div>
                  </TableCell>
                  <TableCell className="text-xs">{c.time_of_death ? new Date(c.time_of_death).toLocaleString("en-IN") : "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{c.cause_1a}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{c.manner_of_death}</Badge></TableCell>
                  <TableCell>{c.is_mlc ? <Badge variant="destructive">MLC</Badge> : "—"}</TableCell>
                  <TableCell className="text-[10px] font-mono">{c.mccd_form_number || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Death Certificate Modal */}
      <Dialog open={showCreate} onOpenChange={onCloseCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>📜 Generate Death Certificate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Patient</Label>
              <Input placeholder="Search patient..." value={patientSearch} onChange={(e) => searchPatients(e.target.value)} />
              {patients.length > 0 && (
                <div className="border rounded mt-1 max-h-32 overflow-auto">
                  {patients.map((p) => (
                    <button key={p.id} onClick={() => { setPatientId(p.id); setPatientSearch(p.full_name); setPatients([]); }}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-muted">{p.full_name} — {p.uhid}</button>
                  ))}
                </div>
              )}
            </div>
            <div><Label className="text-xs">Time of Death *</Label><Input type="datetime-local" value={timeOfDeath} onChange={(e) => setTimeOfDeath(e.target.value)} /></div>
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-semibold">Cause of Death (MCCD Format)</p>
              <div><Label className="text-[10px]">1a. Immediate cause *</Label><Textarea value={cause1a} onChange={(e) => setCause1a(e.target.value)} rows={1} /></div>
              <div><Label className="text-[10px]">1b. Due to (antecedent)</Label><Textarea value={cause1b} onChange={(e) => setCause1b(e.target.value)} rows={1} /></div>
              <div><Label className="text-[10px]">1c. Due to (underlying)</Label><Textarea value={cause1c} onChange={(e) => setCause1c(e.target.value)} rows={1} /></div>
              <div><Label className="text-[10px]">Part II: Contributing conditions</Label><Textarea value={cause2} onChange={(e) => setCause2(e.target.value)} rows={1} /></div>
            </div>
            <div><Label className="text-xs">ICD Code (underlying cause)</Label><Input value={icdCode} onChange={(e) => setIcdCode(e.target.value)} placeholder="e.g. I25.9" /></div>
            <div>
              <Label className="text-xs">Manner of Death</Label>
              <Select value={manner} onValueChange={setManner}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{mannerOptions.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isMlc} onCheckedChange={setIsMlc} />
              <Label className="text-xs">MLC Case</Label>
            </div>
            <div>
              <Label className="text-xs">Certified By *</Label>
              <Select value={certifiedBy} onValueChange={setCertifiedBy}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={createCert} disabled={saving} className="w-full">Generate Certificate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeathCertificatesTab;
