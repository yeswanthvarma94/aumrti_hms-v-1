import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ShieldX, Clock, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  showNewCycle: boolean;
  onCloseNewCycle: () => void;
  onRefresh: () => void;
}

const AUTOCLAVES = [
  { id: "autoclave-1", name: "Autoclave 1 — Pre-vacuum" },
  { id: "autoclave-2", name: "Autoclave 2 — Gravity" },
  { id: "eo-gas", name: "EO Gas Unit" },
];

const METHOD_DEFAULTS: Record<string, { temp: number; psi: number; mins: number }> = {
  steam_autoclave: { temp: 134, psi: 32, mins: 4 },
  eo_gas: { temp: 55, psi: 0, mins: 180 },
  plasma: { temp: 50, psi: 0, mins: 45 },
  dry_heat: { temp: 170, psi: 0, mins: 60 },
  chemical: { temp: 25, psi: 0, mins: 30 },
};

const SterilizeTab: React.FC<Props> = ({ showNewCycle, onCloseNewCycle, onRefresh }) => {
  const { toast } = useToast();
  const [activeCycles, setActiveCycles] = useState<any[]>([]);
  const [pendingBI, setPendingBI] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form state
  const [autoclave, setAutoclave] = useState("autoclave-1");
  const [loadType, setLoadType] = useState("routine");
  const [method, setMethod] = useState("steam_autoclave");
  const [tempC, setTempC] = useState(134);
  const [pressurePsi, setPressurePsi] = useState(32);
  const [durationMin, setDurationMin] = useState(4);
  const [biUsed, setBiUsed] = useState(true);
  const [chemResult, setChemResult] = useState("pass");
  const [selectedSets, setSelectedSets] = useState<string[]>([]);

  // Flash override state
  const [flashModalOpen, setFlashModalOpen] = useState(false);
  const [flashJustification, setFlashJustification] = useState("");
  const [flashApprovedBy, setFlashApprovedBy] = useState("");
  const [flashAcknowledged, setFlashAcknowledged] = useState(false);

  const fetchData = async () => {
    const [cyclesRes, setsRes, usersRes] = await Promise.all([
      supabase.from("sterilization_cycles").select("*, cycle_instruments(*, instrument_sets(set_name))").eq("status", "in_progress").order("cycle_start_at", { ascending: false }),
      supabase.from("instrument_sets").select("*").in("status", ["dirty", "processing", "sterile"]),
      supabase.from("users").select("id, full_name, role"),
    ]);
    if (cyclesRes.data) {
      setActiveCycles(cyclesRes.data);
      setPendingBI(cyclesRes.data.filter((c: any) => c.biological_indicator_used && c.bi_result === "pending"));
    }
    if (setsRes.data) setSets(setsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLoadTypeChange = (val: string) => {
    setLoadType(val);
    if (val === "flash") {
      setFlashModalOpen(true);
    }
  };

  const handleMethodChange = (val: string) => {
    setMethod(val);
    const defaults = METHOD_DEFAULTS[val];
    if (defaults) {
      setTempC(defaults.temp);
      setPressurePsi(defaults.psi);
      setDurationMin(defaults.mins);
    }
  };

  const cancelFlash = () => {
    setFlashModalOpen(false);
    setLoadType("routine");
    setFlashJustification("");
    setFlashApprovedBy("");
    setFlashAcknowledged(false);
  };

  const proceedFlash = async () => {
    if (flashJustification.length < 50) {
      toast({ title: "Justification must be at least 50 characters", variant: "destructive" });
      return;
    }
    if (!flashApprovedBy) {
      toast({ title: "Authoriser is required", variant: "destructive" });
      return;
    }
    if (!flashAcknowledged) {
      toast({ title: "You must acknowledge the risk", variant: "destructive" });
      return;
    }

    // Log clinical alert
    const { data: user } = await supabase.from("users").select("id, hospital_id").limit(1).single();
    if (user) {
      await supabase.from("clinical_alerts").insert({
        hospital_id: user.hospital_id,
        alert_type: "flash_sterilization",
        severity: "high",
        alert_message: `Flash sterilization used — IC team notified. Justification: ${flashJustification.substring(0, 100)}...`,
        patient_id: null,
      });
    }

    setFlashModalOpen(false);
    toast({ title: "⚠️ Flash sterilization authorised", description: "Logged and IC team notified" });
  };

  const startCycle = async () => {
    if (selectedSets.length === 0) {
      toast({ title: "Add at least one set to the load", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.from("users").select("id, hospital_id").limit(1).single();
    if (!user) return;

    const cycleNum = `CYC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const { data: cycle } = await supabase.from("sterilization_cycles").insert({
      hospital_id: user.hospital_id,
      cycle_number: cycleNum,
      autoclave_id: autoclave,
      load_type: loadType,
      sterilization_method: method,
      temperature_c: tempC,
      pressure_psi: pressurePsi,
      duration_minutes: durationMin,
      cycle_start_at: new Date().toISOString(),
      operator_id: user.id,
      biological_indicator_used: biUsed,
      chemical_indicator_result: chemResult,
      flash_justification: loadType === "flash" ? flashJustification : null,
      flash_approved_by: loadType === "flash" ? flashApprovedBy : null,
    }).select().single();

    if (cycle) {
      // Add sets to cycle
      const items = selectedSets.map(sid => ({
        hospital_id: user.hospital_id,
        cycle_id: cycle.id,
        set_id: sid,
        item_type: "set" as const,
      }));
      await supabase.from("cycle_instruments").insert(items);

      // Update set statuses
      for (const sid of selectedSets) {
        await supabase.from("instrument_sets").update({ status: "processing" }).eq("id", sid);
      }
    }

    toast({ title: `Cycle ${cycleNum} started` });
    setSelectedSets([]);
    setLoadType("routine");
    onCloseNewCycle();
    fetchData();
    onRefresh();
  };

  const completeCycle = async (cycle: any) => {
    await supabase.from("sterilization_cycles").update({
      cycle_end_at: new Date().toISOString(),
      status: cycle.biological_indicator_used && cycle.bi_result === "pending" ? "in_progress" : "completed",
    }).eq("id", cycle.id);

    // If no BI or BI already passed, mark sets sterile
    if (!cycle.biological_indicator_used || cycle.bi_result === "pass") {
      const { data: items } = await supabase.from("cycle_instruments").select("set_id").eq("cycle_id", cycle.id);
      if (items) {
        for (const item of items) {
          if (item.set_id) {
            await supabase.from("instrument_sets").update({ status: "sterile" }).eq("id", item.set_id);
          }
        }
      }
      await supabase.from("sterilization_cycles").update({ status: "completed" }).eq("id", cycle.id);
    }

    toast({ title: "Cycle completed" });
    fetchData();
    onRefresh();
  };

  const enterBIResult = async (cycle: any, result: "pass" | "fail") => {
    const { data: user } = await supabase.from("users").select("id, hospital_id").limit(1).single();

    await supabase.from("sterilization_cycles").update({
      bi_result: result,
      bi_result_at: new Date().toISOString(),
      bi_read_by: user?.id,
      status: result === "pass" ? "completed" : "failed",
    }).eq("id", cycle.id);

    const { data: items } = await supabase.from("cycle_instruments").select("set_id").eq("cycle_id", cycle.id);

    if (result === "pass") {
      if (items) {
        for (const item of items) {
          if (item.set_id) await supabase.from("instrument_sets").update({ status: "sterile" }).eq("id", item.set_id);
        }
      }
      toast({ title: "✓ BI Passed — sets marked sterile" });
    } else {
      // STERILITY FAILURE
      if (items) {
        for (const item of items) {
          if (item.set_id) await supabase.from("instrument_sets").update({ status: "quarantine" }).eq("id", item.set_id);
        }
      }
      if (user) {
        await supabase.from("clinical_alerts").insert({
          hospital_id: user.hospital_id,
          alert_type: "sterility_failure",
          severity: "critical",
          alert_message: `STERILITY FAILURE — Cycle ${cycle.cycle_number} BI FAIL. All items quarantined. Do NOT use until re-sterilized and BI passed.`,
        });
      }
      toast({ title: "🔴 STERILITY FAILURE", description: "All items quarantined. Clinical alert raised.", variant: "destructive" });
    }

    fetchData();
    onRefresh();
  };

  const dirtySets = sets.filter(s => s.status === "dirty" || s.status === "processing" || s.status === "sterile");

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: New Cycle Form */}
      <div className="w-[380px] border-r border-border overflow-y-auto p-4 space-y-3 shrink-0">
        <h3 className="text-sm font-bold">New Sterilization Cycle</h3>

        <div>
          <Label className="text-xs">Autoclave</Label>
          <Select value={autoclave} onValueChange={setAutoclave}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUTOCLAVES.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Load Type</Label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {["routine", "emergency", "implant", "flash"].map(lt => (
              <Button key={lt} size="sm" variant={loadType === lt ? "default" : "outline"}
                className={`text-xs capitalize ${lt === "flash" && loadType === lt ? "bg-red-600 hover:bg-red-700" : ""}`}
                onClick={() => handleLoadTypeChange(lt)}>
                {lt === "flash" ? "⚠️ Flash" : lt === "implant" ? "🔬 Implant" : lt === "emergency" ? "⚡ Emergency" : "📋 Routine"}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Method</Label>
          <Select value={method} onValueChange={handleMethodChange}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="steam_autoclave">Steam Autoclave</SelectItem>
              <SelectItem value="eo_gas">EO Gas</SelectItem>
              <SelectItem value="plasma">Plasma (H₂O₂)</SelectItem>
              <SelectItem value="dry_heat">Dry Heat</SelectItem>
              <SelectItem value="chemical">Chemical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Temp (°C)</Label><Input type="number" value={tempC} onChange={e => setTempC(Number(e.target.value))} className="h-9" /></div>
          <div><Label className="text-xs">PSI</Label><Input type="number" value={pressurePsi} onChange={e => setPressurePsi(Number(e.target.value))} className="h-9" /></div>
          <div><Label className="text-xs">Duration (min)</Label><Input type="number" value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} className="h-9" /></div>
        </div>

        <div>
          <Label className="text-xs">Sets in this Load</Label>
          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto border border-border rounded p-2">
            {dirtySets.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={selectedSets.includes(s.id)}
                  onCheckedChange={checked => {
                    setSelectedSets(prev => checked ? [...prev, s.id] : prev.filter(id => id !== s.id));
                  }} />
                <span>{s.set_name}</span>
                <Badge className="text-[9px] ml-auto" variant="outline">{s.status}</Badge>
              </label>
            ))}
            {dirtySets.length === 0 && <p className="text-xs text-muted-foreground">No sets available</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox checked={biUsed} onCheckedChange={v => setBiUsed(!!v)} id="bi" />
          <Label htmlFor="bi" className="text-xs">Biological Indicator included</Label>
        </div>

        <div>
          <Label className="text-xs">Chemical Indicator</Label>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant={chemResult === "pass" ? "default" : "outline"} className={chemResult === "pass" ? "bg-green-600" : ""} onClick={() => setChemResult("pass")}>✓ Pass</Button>
            <Button size="sm" variant={chemResult === "fail" ? "default" : "outline"} className={chemResult === "fail" ? "bg-red-600" : ""} onClick={() => setChemResult("fail")}>✗ Fail</Button>
          </div>
        </div>

        <Button className="w-full" onClick={startCycle} disabled={selectedSets.length === 0}>
          Start Cycle ({selectedSets.length} sets)
        </Button>
      </div>

      {/* Right: Active Cycles + BI Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Active Cycles</h3>
          {activeCycles.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No active cycles</p>}
          <div className="space-y-2">
            {activeCycles.map(c => (
              <div key={c.id} className={`border rounded-lg p-3 ${c.load_type === "flash" ? "border-red-300 bg-red-50" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-mono font-semibold">{c.cycle_number}</span>
                    <Badge className="ml-2 text-[10px]" variant="outline">{c.autoclave_id}</Badge>
                    <Badge className={`ml-1 text-[10px] ${c.load_type === "flash" ? "bg-red-100 text-red-700" : "bg-muted"}`}>{c.load_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Started {formatDistanceToNow(new Date(c.cycle_start_at), { addSuffix: true })}
                    </span>
                    {!c.cycle_end_at && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => completeCycle(c)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Cycle Complete
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {c.cycle_instruments?.map((ci: any) => (
                    <Badge key={ci.id} variant="secondary" className="text-[10px]">{ci.instrument_sets?.set_name || "Instrument"}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {pendingBI.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-amber-700">⏳ Pending BI Results</h3>
            <div className="space-y-2">
              {pendingBI.map(c => (
                <div key={c.id} className="border border-amber-300 bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{c.cycle_number}</span>
                    <span className="text-xs text-muted-foreground">Incubating since {formatDistanceToNow(new Date(c.cycle_start_at), { addSuffix: true })}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => enterBIResult(c, "pass")}>✓ BI Pass</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs" onClick={() => enterBIResult(c, "fail")}>✗ BI Fail</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FLASH STERILIZATION HARD BLOCK MODAL */}
      <Dialog open={flashModalOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg border-2 border-red-500 bg-red-50" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldX className="w-7 h-7" />
              <span className="text-lg font-bold">🚫 FLASH STERILIZATION — NABH VIOLATION</span>
            </div>
            <div className="text-sm text-red-700 space-y-2">
              <p>Flash sterilization is <strong>prohibited by NABH standards</strong> and increases Surgical Site Infection (SSI) risk.</p>
              <p>SSIs cost <strong>₹50,000–₹5,00,000</strong> per case.</p>
              <p className="font-semibold">Flash sterilization may ONLY be used when:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>No sterile alternative is available</li>
                <li>Patient is already on the table</li>
                <li>Delay would cause immediate harm</li>
              </ul>
            </div>

            <div>
              <Label className="text-xs font-semibold text-red-700">Clinical Justification (min 50 characters) *</Label>
              <Textarea value={flashJustification} onChange={e => setFlashJustification(e.target.value)}
                placeholder="Instrument dropped during procedure and no sterile replacement available..."
                rows={3} className="border-red-300" />
              <p className="text-[10px] text-red-500 mt-0.5">{flashJustification.length}/50 characters</p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-red-700">Authorised By *</Label>
              <Select value={flashApprovedBy} onValueChange={setFlashApprovedBy}>
                <SelectTrigger className="h-9 border-red-300"><SelectValue placeholder="Select authoriser..." /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role === "doctor" || u.role === "super_admin" || u.role === "admin").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={flashAcknowledged} onCheckedChange={v => setFlashAcknowledged(!!v)} className="mt-0.5" />
              <span className="text-xs text-red-700">
                I confirm this is a genuine emergency requiring flash sterilization. This event will be logged and reported to the Infection Control Committee.
              </span>
            </label>

            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={cancelFlash}>
                Cancel — Use Routine Cycle Instead
              </Button>
              <Button variant="outline" size="sm" className="text-xs text-muted-foreground border-muted"
                disabled={flashJustification.length < 50 || !flashApprovedBy || !flashAcknowledged}
                onClick={proceedFlash}>
                Proceed with Flash (Logged)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SterilizeTab;
