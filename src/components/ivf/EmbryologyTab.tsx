import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MATURITY_OPTIONS = ["mii", "mi", "gv"];
const FERT_OPTIONS = ["2pn", "1pn", "3pn", "0pn", "abnormal"];
const DISPOSITION_OPTIONS = ["fresh_transfer", "frozen", "discarded", "biopsy", "donated"];

const gradeColor = (icm: string, te: string) => {
  if (icm === "A" && te === "A") return "bg-green-100 text-green-800";
  if ((icm === "A" && te === "B") || (icm === "B" && te === "A")) return "bg-teal-100 text-teal-800";
  if (icm === "B" && te === "B") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
};

const EmbryologyTab = () => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [embryos, setEmbryos] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [embryoId, setEmbryoId] = useState("");
  const [maturity, setMaturity] = useState("");
  const [insType, setInsType] = useState("");
  const [fertStatus, setFertStatus] = useState("");
  const [day3Cells, setDay3Cells] = useState("");
  const [day3Frag, setDay3Frag] = useState("");
  const [day3Grade, setDay3Grade] = useState("");
  const [blastExp, setBlastExp] = useState("");
  const [blastIcm, setBlastIcm] = useState("");
  const [blastTe, setBlastTe] = useState("");
  const [disposition, setDisposition] = useState("fresh_transfer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ivf_cycles").select("id, couple_id, cycle_type, start_date")
      .not("status", "in", '("positive","negative","cancelled")')
      .then(({ data }) => setCycles(data || []));
  }, []);

  const loadEmbryos = async (cycleId: string) => {
    setLoading(true);
    const { data } = await supabase.from("embryology_records").select("*")
      .eq("cycle_id", cycleId).order("embryo_id");
    setEmbryos(data || []);
    setLoading(false);
  };

  useEffect(() => { if (selectedCycleId) loadEmbryos(selectedCycleId); }, [selectedCycleId]);

  const blastGrade = blastExp && blastIcm && blastTe ? `${blastExp}${blastIcm}${blastTe}` : "";

  const handleAdd = async () => {
    if (!selectedCycleId || !embryoId) { toast.error("Cycle and embryo ID required"); return; }
    setSaving(true);
    const { data: userData } = await supabase.from("users").select("hospital_id").limit(1).single();
    const { error } = await supabase.from("embryology_records").insert({
      hospital_id: userData?.hospital_id,
      cycle_id: selectedCycleId,
      embryo_id: embryoId,
      oocyte_maturity: maturity || null,
      insemination_type: insType || null,
      fertilization_status: fertStatus || null,
      day3_cell_count: day3Cells ? parseInt(day3Cells) : null,
      day3_fragmentation: day3Frag || null,
      day3_grade: day3Grade || null,
      blast_expansion: blastExp ? parseInt(blastExp) : null,
      blast_icm: blastIcm || null,
      blast_te: blastTe || null,
      blast_grade: blastGrade || null,
      disposition,
    });
    if (error) { console.error(error); toast.error("Failed to add embryo"); }
    else {
      toast.success("Embryo recorded");
      setShowAdd(false);
      setEmbryoId(""); setMaturity(""); setInsType(""); setFertStatus("");
      setDay3Cells(""); setDay3Frag(""); setDay3Grade("");
      setBlastExp(""); setBlastIcm(""); setBlastTe(""); setDisposition("fresh_transfer");
      loadEmbryos(selectedCycleId);
    }
    setSaving(false);
  };

  // Summary
  const matureCount = embryos.filter((e) => e.oocyte_maturity === "mii").length;
  const fertilizedCount = embryos.filter((e) => e.fertilization_status === "2pn").length;
  const blastCount = embryos.filter((e) => e.blast_grade).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.cycle_type.toUpperCase()} — {c.start_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={!selectedCycleId}>+ Add Embryo</Button>
      </div>

      {/* Summary bar */}
      {selectedCycleId && embryos.length > 0 && (
        <Card className="p-2 flex gap-4 text-xs">
          <span>OPU: <strong>{embryos.length}</strong> oocytes</span>
          <span>Mature: <strong>{matureCount}</strong></span>
          <span>Fertilized (2PN): <strong>{fertilizedCount}</strong></span>
          <span>Blastocysts: <strong>{blastCount}</strong></span>
        </Card>
      )}

      {/* Embryo table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Embryo ID</TableHead>
              <TableHead>Day 0 (Maturity)</TableHead>
              <TableHead>Day 1 (Fert)</TableHead>
              <TableHead>Day 3</TableHead>
              <TableHead>Day 5 (Blast)</TableHead>
              <TableHead>Disposition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {embryos.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                {selectedCycleId ? "No embryos recorded" : "Select a cycle"}
              </TableCell></TableRow>
            ) : embryos.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono font-medium">{e.embryo_id}</TableCell>
                <TableCell>
                  {e.oocyte_maturity ? (
                    <Badge variant={e.oocyte_maturity === "mii" ? "default" : "secondary"}>
                      {e.oocyte_maturity.toUpperCase()}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {e.fertilization_status ? (
                    <Badge variant={e.fertilization_status === "2pn" ? "default" : "destructive"}>
                      {e.fertilization_status.toUpperCase()}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {e.day3_cell_count ? `${e.day3_cell_count} cells ${e.day3_grade || ""}` : "—"}
                </TableCell>
                <TableCell>
                  {e.blast_grade ? (
                    <Badge className={gradeColor(e.blast_icm || "", e.blast_te || "")}>
                      {e.blast_grade}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{e.disposition?.replace("_", " ")}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add Embryo Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Embryo Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Embryo ID *</Label><Input value={embryoId} onChange={(e) => setEmbryoId(e.target.value)} placeholder="EMB-001" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Day 0: Maturity</Label>
                <Select value={maturity} onValueChange={setMaturity}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{MATURITY_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Insemination</Label>
                <Select value={insType} onValueChange={setInsType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {["ivf", "icsi", "imsi"].map((t) => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Day 1: Fertilization</Label>
              <Select value={fertStatus} onValueChange={setFertStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{FERT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Day 3: Cells</Label><Input type="number" value={day3Cells} onChange={(e) => setDay3Cells(e.target.value)} /></div>
              <div><Label className="text-xs">Fragmentation</Label><Input value={day3Frag} onChange={(e) => setDay3Frag(e.target.value)} placeholder="<10%" /></div>
              <div><Label className="text-xs">Grade</Label><Input value={day3Grade} onChange={(e) => setDay3Grade(e.target.value)} placeholder="A/B/C" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Blast Expansion (1-6)</Label><Input type="number" min={1} max={6} value={blastExp} onChange={(e) => setBlastExp(e.target.value)} /></div>
              <div>
                <Label className="text-xs">ICM</Label>
                <Select value={blastIcm} onValueChange={setBlastIcm}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{["A", "B", "C"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">TE</Label>
                <Select value={blastTe} onValueChange={setBlastTe}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{["A", "B", "C"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {blastGrade && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Blast Grade: </span>
                <Badge className={gradeColor(blastIcm, blastTe)}>{blastGrade}</Badge>
              </div>
            )}
            <div>
              <Label className="text-xs">Disposition</Label>
              <Select value={disposition} onValueChange={setDisposition}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DISPOSITION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Record Embryo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmbryologyTab;
