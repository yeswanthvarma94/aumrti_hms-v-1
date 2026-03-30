import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save } from "lucide-react";

const PROCEDURES = [
  "Scaling & Polishing", "Filling (Composite)", "Filling (Amalgam)", "Root Canal Treatment",
  "Crown (PFM)", "Crown (Zirconia)", "Extraction", "Surgical Extraction", "Implant",
  "Bleaching", "Orthodontic Assessment", "Bridge", "Denture",
  "Gingivectomy", "Flap Surgery", "Curettage", "Other",
];

interface TreatmentItem {
  tooth_number: string;
  procedure: string;
  priority: "urgent" | "soon" | "elective";
  cost: number;
  sessions: number;
  status: "planned" | "in_progress" | "completed" | "skipped";
}

interface TreatmentPlanTabProps {
  patientId: string;
  hospitalId: string;
}

const PRIORITY_COLORS = { urgent: "bg-red-500 text-white", soon: "bg-amber-500 text-white", elective: "bg-muted text-muted-foreground" };
const STATUS_COLORS = { planned: "outline", in_progress: "default", completed: "default", skipped: "secondary" } as const;

const TreatmentPlanTab: React.FC<TreatmentPlanTabProps> = ({ patientId, hospitalId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<TreatmentItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TreatmentItem>({
    tooth_number: "", procedure: "", priority: "soon", cost: 0, sessions: 1, status: "planned",
  });

  useEffect(() => {
    loadPlan();
  }, [patientId]);

  const loadPlan = async () => {
    const { data } = await supabase
      .from("dental_treatment_plans")
      .select("*")
      .eq("patient_id", patientId)
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setPlanId(data[0].id);
      const procedures = data[0].procedures as any;
      if (Array.isArray(procedures)) setItems(procedures);
      setConsent(data[0].patient_consent || false);
    }
  };

  const addItem = () => {
    if (!form.procedure) return;
    setItems(prev => [...prev, { ...form }]);
    setForm({ tooth_number: "", procedure: "", priority: "soon", cost: 0, sessions: 1, status: "planned" });
    setShowAdd(false);
  };

  const updateItemStatus = (idx: number, status: TreatmentItem["status"]) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, status } : item));
    if (status === "completed") {
      const item = items[idx];
      toast({ title: `₹${item.cost.toLocaleString("en-IN")} billed to patient account` });
    }
  };

  const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        hospital_id: hospitalId,
        patient_id: patientId,
        procedures: items as any,
        total_cost: totalCost,
        patient_consent: consent,
        consent_date: consent ? new Date().toISOString().split("T")[0] : null,
        status: items.every(i => i.status === "completed") ? "completed" as const
          : items.some(i => i.status === "in_progress" || i.status === "completed") ? "partially_done" as const
          : "active" as const,
      };
      if (planId) {
        const { error } = await supabase.from("dental_treatment_plans").update(payload).eq("id", planId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dental_treatment_plans").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Treatment plan saved" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Treatment Plan</h4>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" /> Add Item</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Tooth</TableHead>
              <TableHead>Procedure</TableHead>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead className="w-20">Cost ₹</TableHead>
              <TableHead className="w-16">Sessions</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items yet. Click "+ Add Item" above.</TableCell></TableRow>
            )}
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-xs">{item.tooth_number || "—"}</TableCell>
                <TableCell className="text-xs">{item.procedure}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] capitalize ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">₹{item.cost.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-xs text-center">{item.sessions}</TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(v) => updateItemStatus(idx, v as TreatmentItem["status"])}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length > 0 && (
          <div className="border-t px-4 py-2 flex justify-end">
            <span className="text-sm font-semibold">Total: ₹{totalCost.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>

      {/* Consent */}
      <div className="flex items-center gap-3 bg-card rounded-lg border p-3">
        <Switch checked={consent} onCheckedChange={setConsent} />
        <span className="text-sm">Patient consented to treatment plan</span>
        {consent && <Badge variant="outline" className="text-xs">Consented {new Date().toLocaleDateString("en-IN")}</Badge>}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save size={16} className="mr-2" />
        {saving ? "Saving..." : "Save Treatment Plan"}
      </Button>

      {/* Add Item Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Treatment Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Tooth Number</label>
              <Input value={form.tooth_number} onChange={(e) => setForm({ ...form, tooth_number: e.target.value })} placeholder="e.g. 16" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Procedure</label>
              <Select value={form.procedure} onValueChange={(v) => setForm({ ...form, procedure: v })}>
                <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                <SelectContent>
                  {PROCEDURES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="soon">Soon</SelectItem>
                    <SelectItem value="elective">Elective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Cost ₹</label>
                <Input type="number" value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="w-20">
                <label className="text-xs text-muted-foreground">Sessions</label>
                <Input type="number" min={1} value={form.sessions} onChange={(e) => setForm({ ...form, sessions: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <Button onClick={addItem} className="w-full" disabled={!form.procedure}>Add to Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentPlanTab;
