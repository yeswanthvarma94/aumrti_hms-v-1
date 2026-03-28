import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatBloodGroup, componentLabel } from "@/lib/bloodCompatibility";
import { formatDistanceToNow } from "date-fns";

interface Props {
  showModal: boolean;
  onCloseModal: () => void;
  onRefresh: () => void;
}

const RequestsTab: React.FC<Props> = ({ showModal, onCloseModal, onRefresh }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [matchingUnits, setMatchingUnits] = useState<any[]>([]);
  const [form, setForm] = useState({ blood_group: 'O', rh_factor: 'positive', component: 'rbc', units_required: 1, urgency: 'routine', indication: '', patient_id: '' });
  const [patients, setPatients] = useState<any[]>([]);

  const fetchRequests = async () => {
    const { data } = await supabase.from("blood_requests").select("*, patients(full_name, uhid)").order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  const fetchPatients = async () => {
    const { data } = await supabase.from("patients").select("id, full_name, uhid, blood_group").limit(200);
    if (data) setPatients(data);
  };

  useEffect(() => { fetchRequests(); fetchPatients(); }, []);

  const selectRequest = async (req: any) => {
    setSelectedReq(req);
    const { data } = await supabase.from("blood_units")
      .select("*")
      .eq("blood_group", req.blood_group)
      .eq("rh_factor", req.rh_factor)
      .eq("component", req.component)
      .eq("status", "available")
      .gt("expiry_at", new Date().toISOString())
      .order("expiry_at", { ascending: true });
    if (data) setMatchingUnits(data);
  };

  const reserveUnit = async (unitId: string) => {
    if (!selectedReq) return;
    await supabase.from("blood_units").update({ status: "reserved", reserved_for: selectedReq.patient_id }).eq("id", unitId);
    toast({ title: "Unit reserved", description: `Reserved for ${selectedReq.patients?.full_name}` });
    selectRequest(selectedReq);
    onRefresh();
  };

  const submitRequest = async () => {
    if (!form.patient_id || !form.indication) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.from("users").select("id, hospital_id").limit(1).single();
    if (!user) return;
    await supabase.from("blood_requests").insert({
      hospital_id: user.hospital_id,
      patient_id: form.patient_id,
      requested_by: user.id,
      blood_group: form.blood_group,
      rh_factor: form.rh_factor,
      component: form.component,
      units_required: form.units_required,
      urgency: form.urgency,
      indication: form.indication,
    });
    toast({ title: "Blood request submitted" });
    onCloseModal();
    fetchRequests();
  };

  const urgencyBadge = (u: string) => {
    if (u === "emergency") return <Badge className="bg-red-100 text-red-700 text-[10px]">🚨 EMERGENCY</Badge>;
    if (u === "urgent") return <Badge className="bg-amber-100 text-amber-700 text-[10px]">⚡ URGENT</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">📋 Routine</Badge>;
  };

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-[320px] border-r border-border overflow-y-auto p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending Requests</p>
        {requests.filter(r => r.status === 'pending' || r.status === 'processing').map(req => (
          <button
            key={req.id}
            onClick={() => selectRequest(req)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedReq?.id === req.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{req.patients?.full_name || "Patient"}</span>
              {urgencyBadge(req.urgency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{req.patients?.uhid}</p>
            <p className="text-xs mt-1">
              <span className="font-semibold">{formatBloodGroup(req.blood_group, req.rh_factor)}</span> · {componentLabel(req.component)} · {req.units_required} units
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
          </button>
        ))}
        {requests.filter(r => r.status === 'pending' || r.status === 'processing').length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No pending requests</p>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedReq ? (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold">{selectedReq.patients?.full_name}</h3>
              <p className="text-xs text-muted-foreground">{selectedReq.patients?.uhid} · {formatBloodGroup(selectedReq.blood_group, selectedReq.rh_factor)}</p>
              <p className="text-xs mt-1">Need: {selectedReq.units_required} × {componentLabel(selectedReq.component)}</p>
              <p className="text-xs text-muted-foreground">Indication: {selectedReq.indication}</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Available Matching Units (FEFO)</p>
              {matchingUnits.length === 0 ? (
                <p className="text-xs text-red-600">No matching units available. Consider external requisition.</p>
              ) : (
                <div className="space-y-1">
                  {matchingUnits.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 border border-border rounded text-xs">
                      <span className="font-mono">{u.unit_number}</span>
                      <span>{u.volume_ml}ml</span>
                      <span>{u.storage_location}</span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => reserveUnit(u.id)}>Reserve</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-semibold">ABO Compatibility Guide</p>
              <p>O- is universal RBC donor. AB+ is universal recipient.</p>
              <p className="mt-1">If exact match unavailable: A→A,O | B→B,O | AB→any | O→O only</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">Select a request to view matching units</p>
        )}
      </div>

      {/* New Request Modal */}
      <Dialog open={showModal} onOpenChange={onCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Blood Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Patient</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.uhid})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Blood Group</Label>
                <Select value={form.blood_group} onValueChange={v => setForm(f => ({ ...f, blood_group: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['A','B','AB','O'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rh Factor</Label>
                <Select value={form.rh_factor} onValueChange={v => setForm(f => ({ ...f, rh_factor: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Component</Label>
                <Select value={form.component} onValueChange={v => setForm(f => ({ ...f, component: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rbc">RBC</SelectItem>
                    <SelectItem value="whole_blood">Whole Blood</SelectItem>
                    <SelectItem value="ffp">FFP</SelectItem>
                    <SelectItem value="platelets">Platelets</SelectItem>
                    <SelectItem value="cryoprecipitate">Cryoprecipitate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Units Required</Label>
                <Input type="number" min={1} max={10} value={form.units_required} onChange={e => setForm(f => ({ ...f, units_required: parseInt(e.target.value) || 1 }))} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Urgency</Label>
              <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Indication</Label>
              <Textarea placeholder="Clinical indication for transfusion..." value={form.indication} onChange={e => setForm(f => ({ ...f, indication: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full" onClick={submitRequest}>Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsTab;
