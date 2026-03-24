import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const incidentTypes = [
  "fall", "medication_error", "near_miss", "adverse_event",
  "procedure_complication", "equipment_failure", "infection", "complaint", "other",
];

const severities = ["minor", "moderate", "major", "sentinel"];

const FileIncidentModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    incident_type: "near_miss",
    severity: "minor",
    description: "",
    immediate_action: "",
    incident_date: new Date().toISOString().split("T")[0],
  });

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) { toast({ title: "Not authenticated", variant: "destructive" }); setSaving(false); return; }

      const { data: userProfile } = await supabase.from("users").select("hospital_id").eq("auth_user_id", userId).single();
      if (!userProfile) { toast({ title: "User profile not found", variant: "destructive" }); setSaving(false); return; }

      const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}`;

      await supabase.from("incident_reports").insert({
        hospital_id: userProfile.hospital_id,
        incident_number: incidentNumber,
        incident_date: form.incident_date,
        incident_type: form.incident_type,
        severity: form.severity,
        description: form.description,
        immediate_action: form.immediate_action || null,
        reported_by: userId,
      });

      toast({ title: "Incident filed", description: incidentNumber });
      onOpenChange(false);
      setForm({ incident_type: "near_miss", severity: "minor", description: "", immediate_action: "", incident_date: new Date().toISOString().split("T")[0] });
    } catch (err: any) {
      toast({ title: "Error filing incident", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">File Incident Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Incident Date</Label>
            <Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {severities.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 text-xs" rows={3} placeholder="What happened?" />
          </div>
          <div>
            <Label className="text-xs">Immediate Action Taken</Label>
            <Textarea value={form.immediate_action} onChange={(e) => setForm({ ...form, immediate_action: e.target.value })} className="mt-1 text-xs" rows={2} placeholder="Optional" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
            {saving ? "Saving…" : "File Incident"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileIncidentModal;
