import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHospitalId } from "@/hooks/useHospitalId";

interface CryoRecord {
  id: string;
  patient_id: string;
  ivf_cycle_id: string | null;
  embryo_id: string;
  embryo_grade: string | null;
  freeze_date: string;
  expiry_date: string;
  storage_tank: string;
  storage_canister: string;
  storage_goblet: string;
  cryo_medium: string | null;
  status: string;
  thaw_date: string | null;
  outcome: string | null;
  consent_expiry_date: string | null;
  notes: string | null;
}

const TANK_GRID = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"];

const daysUntil = (date: string | null) => {
  if (!date) return null;
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
};

const CryobankTab = () => {
  const { hospitalId } = useHospitalId();
  const [records, setRecords] = useState<CryoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const [selectedCanister, setSelectedCanister] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmbryo, setSelectedEmbryo] = useState<CryoRecord | null>(null);

  const [form, setForm] = useState({
    patient_id: "",
    ivf_cycle_id: "",
    embryo_id: "",
    embryo_grade: "",
    freeze_date: new Date().toISOString().split("T")[0],
    storage_tank: "T1",
    storage_canister: "C1",
    storage_goblet: "G1",
    cryo_medium: "Vitrification - Kitazato",
    consent_expiry_date: "",
    notes: "",
  });

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cryobank_records" as any)
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("freeze_date", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load cryobank");
    }
    setRecords((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hospitalId]);

  // Aggregate counts per tank
  const tankCounts = useMemo(() => {
    const m: Record<string, number> = {};
    records.filter(r => r.status === "frozen").forEach(r => {
      m[r.storage_tank] = (m[r.storage_tank] || 0) + 1;
    });
    return m;
  }, [records]);

  // Canisters in selected tank
  const canisters = useMemo(() => {
    if (!selectedTank) return [];
    const set = new Set(records.filter(r => r.storage_tank === selectedTank).map(r => r.storage_canister));
    return Array.from(set).sort();
  }, [selectedTank, records]);

  // Goblets/embryos in selected canister
  const goblets = useMemo(() => {
    if (!selectedTank || !selectedCanister) return [];
    return records.filter(r => r.storage_tank === selectedTank && r.storage_canister === selectedCanister);
  }, [selectedTank, selectedCanister, records]);

  const expiringSoon = useMemo(() => {
    return records.filter(r => {
      if (r.status !== "frozen" || !r.consent_expiry_date) return false;
      const d = daysUntil(r.consent_expiry_date);
      return d !== null && d <= 90;
    });
  }, [records]);

  const handleAdd = async () => {
    if (!hospitalId) return toast.error("No hospital");
    if (!form.patient_id || !form.embryo_id) return toast.error("Patient ID and Embryo ID required");

    // Default expiry = freeze + 5 years
    const freeze = new Date(form.freeze_date);
    const expiry = new Date(freeze);
    expiry.setFullYear(expiry.getFullYear() + 5);

    const { error } = await supabase.from("cryobank_records" as any).insert({
      hospital_id: hospitalId,
      patient_id: form.patient_id,
      ivf_cycle_id: form.ivf_cycle_id || null,
      embryo_id: form.embryo_id,
      embryo_grade: form.embryo_grade || null,
      freeze_date: form.freeze_date,
      expiry_date: expiry.toISOString().split("T")[0],
      storage_tank: form.storage_tank,
      storage_canister: form.storage_canister,
      storage_goblet: form.storage_goblet,
      cryo_medium: form.cryo_medium || null,
      consent_expiry_date: form.consent_expiry_date || null,
      notes: form.notes || null,
      status: "frozen",
    });

    if (error) return toast.error(error.message);
    toast.success("Embryo added to cryobank");
    setShowAdd(false);
    setForm({ ...form, patient_id: "", embryo_id: "", embryo_grade: "", notes: "" });
    load();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "thawed" || newStatus === "discarded") {
      update.thaw_date = new Date().toISOString().split("T")[0];
    }
    const { error } = await supabase.from("cryobank_records" as any).update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Embryo marked ${newStatus}`);
    setSelectedEmbryo(null);
    load();
  };

  const gobletColor = (r: CryoRecord) => {
    if (r.status !== "frozen") return "bg-muted text-muted-foreground";
    const d = daysUntil(r.consent_expiry_date);
    if (d !== null && d <= 30) return "bg-red-500 text-white hover:bg-red-600";
    if (d !== null && d <= 90) return "bg-amber-500 text-white hover:bg-amber-600";
    return "bg-green-600 text-white hover:bg-green-700";
  };

  return (
    <div className="space-y-4">
      {/* Consent expiry banner */}
      {expiringSoon.length > 0 && (
        <Card className="p-3 border-amber-300 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">
            ⚠️ {expiringSoon.length} embryo(s) have consent expiring within 90 days — contact patients
          </p>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Cryobank — {records.filter(r => r.status === "frozen").length} frozen embryos
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Embryo</Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Tank map */}
        <Card className="col-span-4 p-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">TANKS</h4>
          <div className="grid grid-cols-3 gap-2">
            {TANK_GRID.map(t => (
              <button
                key={t}
                onClick={() => { setSelectedTank(t); setSelectedCanister(null); }}
                className={`aspect-square rounded-md border-2 flex flex-col items-center justify-center text-xs transition-colors ${
                  selectedTank === t ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                }`}
              >
                <span className="font-bold">{t}</span>
                <span className="text-[10px] text-muted-foreground">{tankCounts[t] || 0} emb</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Canisters */}
        <Card className="col-span-3 p-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
            CANISTERS {selectedTank ? `· ${selectedTank}` : ""}
          </h4>
          {!selectedTank ? (
            <p className="text-xs text-muted-foreground">Select a tank</p>
          ) : canisters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No canisters in use</p>
          ) : (
            <div className="space-y-1">
              {canisters.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCanister(c)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs border transition-colors ${
                    selectedCanister === c ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Goblets / embryos */}
        <Card className="col-span-5 p-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
            GOBLETS {selectedCanister ? `· ${selectedCanister}` : ""}
          </h4>
          {!selectedCanister ? (
            <p className="text-xs text-muted-foreground">Select a canister</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {goblets.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedEmbryo(g)}
                  className={`p-2 rounded-md text-xs font-mono transition-colors ${gobletColor(g)}`}
                  title={`${g.embryo_id} · ${g.embryo_grade || "—"}`}
                >
                  <div className="font-bold">{g.storage_goblet}</div>
                  <div className="text-[10px] opacity-90">{g.embryo_id}</div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" />Frozen</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" />&lt;90d</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" />&lt;30d</span>
          </div>
        </Card>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {/* Add embryo dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Embryo to Cryobank</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Patient ID *</Label>
              <Input value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} placeholder="UUID" />
            </div>
            <div>
              <Label>IVF Cycle ID</Label>
              <Input value={form.ivf_cycle_id} onChange={(e) => setForm({ ...form, ivf_cycle_id: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <Label>Embryo ID *</Label>
              <Input value={form.embryo_id} onChange={(e) => setForm({ ...form, embryo_id: e.target.value })} placeholder="E-001" />
            </div>
            <div>
              <Label>Grade</Label>
              <Input value={form.embryo_grade} onChange={(e) => setForm({ ...form, embryo_grade: e.target.value })} placeholder="4AA" />
            </div>
            <div>
              <Label>Freeze Date *</Label>
              <Input type="date" value={form.freeze_date} onChange={(e) => setForm({ ...form, freeze_date: e.target.value })} />
            </div>
            <div>
              <Label>Consent Expiry</Label>
              <Input type="date" value={form.consent_expiry_date} onChange={(e) => setForm({ ...form, consent_expiry_date: e.target.value })} />
            </div>
            <div>
              <Label>Tank *</Label>
              <Select value={form.storage_tank} onValueChange={(v) => setForm({ ...form, storage_tank: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TANK_GRID.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canister *</Label>
              <Input value={form.storage_canister} onChange={(e) => setForm({ ...form, storage_canister: e.target.value })} placeholder="C1" />
            </div>
            <div>
              <Label>Goblet *</Label>
              <Input value={form.storage_goblet} onChange={(e) => setForm({ ...form, storage_goblet: e.target.value })} placeholder="G1" />
            </div>
            <div>
              <Label>Cryo Medium</Label>
              <Input value={form.cryo_medium} onChange={(e) => setForm({ ...form, cryo_medium: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Embryo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embryo detail dialog */}
      <Dialog open={!!selectedEmbryo} onOpenChange={() => setSelectedEmbryo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Embryo Details</DialogTitle></DialogHeader>
          {selectedEmbryo && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Embryo:</span> <span className="font-mono font-semibold">{selectedEmbryo.embryo_id}</span></div>
                <div><span className="text-muted-foreground">Grade:</span> <Badge variant="outline">{selectedEmbryo.embryo_grade || "—"}</Badge></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-mono">{selectedEmbryo.storage_tank}/{selectedEmbryo.storage_canister}/{selectedEmbryo.storage_goblet}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selectedEmbryo.status}</Badge></div>
                <div><span className="text-muted-foreground">Freeze date:</span> {selectedEmbryo.freeze_date}</div>
                <div><span className="text-muted-foreground">Expiry:</span> {selectedEmbryo.expiry_date}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Consent expiry:</span> {selectedEmbryo.consent_expiry_date || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Medium:</span> {selectedEmbryo.cryo_medium || "—"}</div>
                {selectedEmbryo.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selectedEmbryo.notes}</div>}
              </div>
              {selectedEmbryo.status === "frozen" && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedEmbryo.id, "thawed")}>Mark Thawed</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedEmbryo.id, "transferred")}>Mark Transferred</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selectedEmbryo.id, "discarded")}>Discard</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CryobankTab;
