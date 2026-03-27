import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Step { name: string; role: string; required: boolean; timeLimit: number; }

const presets: Record<string, Step[]> = {
  simple: [
    { name: "Clinical Clearance", role: "Doctor", required: true, timeLimit: 30 },
    { name: "Billing Settlement", role: "Billing Executive", required: true, timeLimit: 60 },
  ],
  standard: [
    { name: "Clinical Clearance", role: "Doctor", required: true, timeLimit: 30 },
    { name: "Pharmacy Clearance", role: "Pharmacist", required: true, timeLimit: 20 },
    { name: "Billing Settlement", role: "Billing Executive", required: true, timeLimit: 60 },
    { name: "Nursing Clearance", role: "Nurse", required: true, timeLimit: 15 },
  ],
  insurance: [
    { name: "Clinical Clearance", role: "Doctor", required: true, timeLimit: 30 },
    { name: "Pharmacy Clearance", role: "Pharmacist", required: true, timeLimit: 20 },
    { name: "Insurance Pre-approval", role: "Insurance Coordinator", required: true, timeLimit: 120 },
    { name: "Billing Settlement", role: "Billing Executive", required: true, timeLimit: 60 },
    { name: "TPA Final Clearance", role: "Insurance Coordinator", required: true, timeLimit: 60 },
    { name: "Nursing Clearance", role: "Nurse", required: true, timeLimit: 15 },
  ],
};

const roles = ["Doctor", "Nurse", "Pharmacist", "Billing Executive", "Insurance Coordinator", "Admin"];

const SettingsDischargeWorkflowPage: React.FC = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<Step[]>(presets.standard);

  const handleSave = () => { setSaving(true); setTimeout(() => { toast({ title: "Discharge workflow saved" }); setSaving(false); }, 500); };

  return (
    <SettingsPageWrapper title="Discharge Workflow" onSave={handleSave} saving={saving}>
      <p className="text-sm text-muted-foreground mb-4">Configure the steps required before a patient can be discharged.</p>

      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => setSteps(presets.simple)}>Simple Cash — 2 steps</Button>
        <Button variant="outline" size="sm" onClick={() => setSteps(presets.standard)}>Standard — 4 steps</Button>
        <Button variant="outline" size="sm" onClick={() => setSteps(presets.insurance)}>Insurance — 6 steps</Button>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
            <GripVertical size={14} className="text-muted-foreground cursor-grab" />
            <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
            <Input value={step.name} onChange={(e) => { const n = [...steps]; n[i].name = e.target.value; setSteps(n); }} className="flex-1 h-8" />
            <Select value={step.role} onValueChange={(v) => { const n = [...steps]; n[i].role = v; setSteps(n); }}>
              <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input type="number" value={step.timeLimit} onChange={(e) => { const n = [...steps]; n[i].timeLimit = +e.target.value; setSteps(n); }} className="w-16 h-8" />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
            <Switch checked={step.required} onCheckedChange={(v) => { const n = [...steps]; n[i].required = v; setSteps(n); }} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><Trash2 size={13} /></Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setSteps([...steps, { name: "", role: "Doctor", required: true, timeLimit: 30 }])}>
        <Plus size={14} /> Add Step
      </Button>
    </SettingsPageWrapper>
  );
};

export default SettingsDischargeWorkflowPage;
