import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_COLS = [
  { key: "stimulation", label: "Stimulation", color: "bg-blue-50 border-blue-200" },
  { key: "opu_done", label: "OPU Done", color: "bg-purple-50 border-purple-200" },
  { key: "fertilization", label: "Fertilization", color: "bg-teal-50 border-teal-200" },
  { key: "et_done", label: "ET Done", color: "bg-green-50 border-green-200" },
  { key: "luteal_support", label: "Awaiting Result", color: "bg-amber-50 border-amber-200" },
];

const CYCLE_TYPES = ["ivf", "icsi", "fet", "iui", "imsi", "donor_egg", "donor_sperm", "surrogacy"];
const PROTOCOLS = ["Long agonist", "Short agonist", "Antagonist", "Mini IVF", "Natural cycle"];

interface Props {
  showStartCycle: boolean;
  onCloseStartCycle: () => void;
  onRefreshKPIs: () => void;
}

const CyclesTab = ({ showStartCycle, onCloseStartCycle, onRefreshKPIs }: Props) => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [couples, setCouples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [coupleId, setCoupleId] = useState("");
  const [cycleType, setCycleType] = useState("");
  const [protocol, setProtocol] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [cyclesRes, couplesRes] = await Promise.all([
      supabase.from("ivf_cycles").select("*").order("created_at", { ascending: false }),
      supabase.from("art_couples").select("id, couple_code, consent_obtained").eq("is_active", true),
    ]);
    if (cyclesRes.error) console.error(cyclesRes.error);
    if (couplesRes.error) console.error(couplesRes.error);
    setCycles(cyclesRes.data || []);
    setCouples(couplesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleStartCycle = async () => {
    if (!coupleId || !cycleType) { toast.error("Couple and cycle type are required"); return; }
    const couple = couples.find((c) => c.id === coupleId);
    if (!couple?.consent_obtained) { toast.error("Cannot start cycle — consent not obtained"); return; }

    setSaving(true);
    const { data: userData } = await supabase.from("users").select("hospital_id").limit(1).single();
    const existingCount = cycles.filter((c) => c.couple_id === coupleId).length;

    const { error } = await supabase.from("ivf_cycles").insert({
      hospital_id: userData?.hospital_id,
      couple_id: coupleId,
      cycle_number: existingCount + 1,
      cycle_type: cycleType,
      protocol: protocol || null,
      start_date: new Date().toISOString().split("T")[0],
    });

    if (error) { console.error(error); toast.error("Failed to start cycle"); }
    else {
      toast.success("Cycle started");
      onCloseStartCycle();
      setCoupleId(""); setCycleType(""); setProtocol("");
      loadData();
      onRefreshKPIs();
    }
    setSaving(false);
  };

  const getStatusCycles = (status: string) => {
    if (status === "luteal_support") return cycles.filter((c) => ["luteal_support", "test_due"].includes(c.status));
    return cycles.filter((c) => c.status === status);
  };

  const typeLabel = (t: string) => t.toUpperCase().replace("_", " ");

  return (
    <div className="space-y-4">
      {/* Kanban */}
      <div className="grid grid-cols-5 gap-3" style={{ minHeight: 300 }}>
        {STATUS_COLS.map((col) => (
          <div key={col.key} className={`rounded-lg border p-2 ${col.color}`}>
            <h3 className="text-xs font-semibold mb-2 px-1">{col.label} ({getStatusCycles(col.key).length})</h3>
            <div className="space-y-2 overflow-auto" style={{ maxHeight: 400 }}>
              {getStatusCycles(col.key).map((c) => {
                const couple = couples.find((cp) => cp.id === c.couple_id);
                const daysSinceStart = Math.floor((Date.now() - new Date(c.start_date).getTime()) / 86400000);
                return (
                  <Card key={c.id} className="p-2 text-xs space-y-1">
                    <div className="font-mono font-medium">{couple?.couple_code || "—"}</div>
                    <Badge variant="outline" className="text-[10px]">{typeLabel(c.cycle_type)}</Badge>
                    <div className="text-muted-foreground">Day {daysSinceStart} • Cycle #{c.cycle_number}</div>
                    {c.protocol && <div className="text-muted-foreground">{c.protocol}</div>}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Start Cycle Modal */}
      <Dialog open={showStartCycle} onOpenChange={(o) => { if (!o) onCloseStartCycle(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start New IVF Cycle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Couple *</Label>
              <Select value={coupleId} onValueChange={setCoupleId}>
                <SelectTrigger><SelectValue placeholder="Select couple" /></SelectTrigger>
                <SelectContent>
                  {couples.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.couple_code} {!c.consent_obtained && "⚠️ No consent"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cycle Type *</Label>
              <Select value={cycleType} onValueChange={setCycleType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {CYCLE_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Protocol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStartCycle} disabled={saving} className="w-full">
              {saving ? "Starting…" : "Begin Cycle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CyclesTab;
