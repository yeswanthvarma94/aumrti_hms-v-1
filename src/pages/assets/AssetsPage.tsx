import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalId } from "@/hooks/useHospitalId";
import { useToast } from "@/hooks/use-toast";
import { formatINR, roundCurrency } from "@/lib/currency";
import { autoPostJournalEntry } from "@/lib/accounting";
import { Building2, Plus, Eye, Download, AlertTriangle } from "lucide-react";

interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  category: string;
  description: string | null;
  purchase_date: string;
  purchase_cost: number;
  useful_life_years: number | null;
  salvage_value: number | null;
  depreciation_method: string | null;
  wdv_rate: number | null;
  current_book_value: number | null;
  accumulated_depreciation: number | null;
  location: string | null;
  department: string | null;
  insurance_policy_number: string | null;
  insurance_expiry_date: string | null;
  insurance_premium: number | null;
  it_block_category: string | null;
  status: string;
  disposal_date: string | null;
  disposal_amount: number | null;
  disposal_reason: string | null;
}

const CATEGORIES = ["medical_equipment", "furniture", "it_equipment", "vehicle", "building", "other"];
const IT_BLOCKS = [
  { key: "Block 1 (60%)", rate: 60 },
  { key: "Block 2 (40%)", rate: 40 },
  { key: "Block 3 (25%)", rate: 25 },
  { key: "Block 4 (15%)", rate: 15 },
  { key: "Block 5 (10%)", rate: 10 },
];

const emptyForm = {
  asset_code: "",
  asset_name: "",
  category: "medical_equipment",
  description: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  purchase_cost: "",
  useful_life_years: "5",
  salvage_value: "0",
  depreciation_method: "slm",
  wdv_rate: "",
  location: "",
  department: "",
  insurance_policy_number: "",
  insurance_expiry_date: "",
  insurance_premium: "",
  it_block_category: "Block 4 (15%)",
};

const AssetsPage: React.FC = () => {
  const { hospitalId } = useHospitalId();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const loadAssets = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("assets" as any)
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: "Failed to load assets", variant: "destructive" });
    } else {
      setAssets((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAssets();
  }, [hospitalId]);

  const filtered = useMemo(() => {
    return assets.filter(
      (a) =>
        (filterCategory === "all" || a.category === filterCategory) &&
        (filterStatus === "all" || a.status === filterStatus),
    );
  }, [assets, filterCategory, filterStatus]);

  const handleAdd = async () => {
    if (!hospitalId) return;
    if (!form.asset_code || !form.asset_name || !form.purchase_cost) {
      toast({ title: "Asset code, name and cost are required", variant: "destructive" });
      return;
    }
    const cost = Number(form.purchase_cost);
    const payload = {
      hospital_id: hospitalId,
      asset_code: form.asset_code,
      asset_name: form.asset_name,
      category: form.category,
      description: form.description || null,
      purchase_date: form.purchase_date,
      purchase_cost: cost,
      useful_life_years: Number(form.useful_life_years) || 5,
      salvage_value: Number(form.salvage_value) || 0,
      depreciation_method: form.depreciation_method,
      wdv_rate: form.depreciation_method === "wdv" ? Number(form.wdv_rate) || null : null,
      current_book_value: cost,
      accumulated_depreciation: 0,
      location: form.location || null,
      department: form.department || null,
      insurance_policy_number: form.insurance_policy_number || null,
      insurance_expiry_date: form.insurance_expiry_date || null,
      insurance_premium: form.insurance_premium ? Number(form.insurance_premium) : null,
      it_block_category: form.it_block_category || null,
      status: "active",
    };
    const { error } = await supabase.from("assets" as any).insert(payload);
    if (error) {
      toast({ title: "Failed to add asset", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Asset added" });
    setShowAdd(false);
    setForm(emptyForm);
    loadAssets();
  };

  const computeAnnualDep = (a: Asset, openingBV: number): number => {
    if (a.depreciation_method === "wdv") {
      const rate = a.wdv_rate || 15;
      return roundCurrency((openingBV * rate) / 100);
    }
    const life = a.useful_life_years || 5;
    return roundCurrency((a.purchase_cost - (a.salvage_value || 0)) / life);
  };

  const buildSchedule = (a: Asset) => {
    const rows: { year: number; openingBV: number; dep: number; closingBV: number }[] = [];
    let bv = a.purchase_cost;
    const years = a.useful_life_years || 5;
    for (let y = 1; y <= years; y++) {
      const dep = computeAnnualDep(a, bv);
      const closing = Math.max(roundCurrency(bv - dep), a.salvage_value || 0);
      rows.push({ year: y, openingBV: bv, dep, closingBV: closing });
      bv = closing;
      if (bv <= (a.salvage_value || 0)) break;
    }
    return rows;
  };

  const postDepreciation = async (a: Asset) => {
    if (!hospitalId) return;
    setPosting(true);
    const openingBV = a.current_book_value ?? a.purchase_cost;
    const dep = computeAnnualDep(a, openingBV);
    if (dep <= 0) {
      toast({ title: "No depreciation to post" });
      setPosting(false);
      return;
    }
    try {
      await autoPostJournalEntry({
        triggerEvent: "asset_depreciation",
        sourceModule: "assets",
        sourceId: a.id,
        amount: dep,
        description: `Depreciation - ${a.asset_code} ${a.asset_name}`,
        hospitalId,
        postedBy: "",
      });
      const newBV = roundCurrency(openingBV - dep);
      const newAcc = roundCurrency((a.accumulated_depreciation || 0) + dep);
      await supabase
        .from("assets" as any)
        .update({ current_book_value: newBV, accumulated_depreciation: newAcc })
        .eq("id", a.id);
      toast({ title: `Posted depreciation: ${formatINR(dep)}` });
      loadAssets();
    } catch (e: any) {
      toast({ title: "Failed to post journal", description: e?.message, variant: "destructive" });
    }
    setPosting(false);
  };

  const selected = assets.find((a) => a.id === selectedId);

  // Insurance status
  const insuranceStatus = (date: string | null) => {
    if (!date) return null;
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "Expired", color: "destructive" as const };
    if (days <= 30) return { label: `${days}d left`, color: "default" as const, amber: true };
    return { label: "Active", color: "default" as const, green: true };
  };

  const renewalDueCount = assets.filter((a) => {
    if (!a.insurance_expiry_date) return false;
    const days = Math.ceil((new Date(a.insurance_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30;
  }).length;

  // IT Block reconciliation
  const itBlockReconciliation = useMemo(() => {
    const rows: any[] = [];
    IT_BLOCKS.forEach((b) => {
      const blockAssets = assets.filter((a) => a.it_block_category === b.key && a.status !== "disposed");
      if (blockAssets.length === 0) {
        rows.push({ block: b.key, rate: b.rate, opening: 0, additions: 0, disposals: 0, dep: 0, closing: 0, count: 0 });
        return;
      }
      const opening = blockAssets.reduce((s, a) => s + (a.current_book_value ?? a.purchase_cost), 0);
      const fyStart = new Date(new Date().getFullYear(), 3, 1);
      const additions = blockAssets
        .filter((a) => new Date(a.purchase_date) >= fyStart)
        .reduce((s, a) => s + a.purchase_cost, 0);
      const disposalsArr = assets.filter(
        (a) => a.it_block_category === b.key && a.status === "disposed" && a.disposal_date && new Date(a.disposal_date) >= fyStart,
      );
      const disposals = disposalsArr.reduce((s, a) => s + (a.disposal_amount || 0), 0);
      const depBase = opening + additions - disposals;
      const dep = roundCurrency((depBase * b.rate) / 100);
      const closing = roundCurrency(depBase - dep);
      rows.push({ block: b.key, rate: b.rate, opening, additions, disposals, dep, closing, count: blockAssets.length });
    });
    return rows;
  }, [assets]);

  const exportITBlockCSV = () => {
    const header = "Block,Rate (%),Opening WDV,Additions,Disposals,Depreciation,Closing WDV,Asset Count\n";
    const rows = itBlockReconciliation
      .map((r) => `"${r.block}",${r.rate},${r.opening.toFixed(2)},${r.additions.toFixed(2)},${r.disposals.toFixed(2)},${r.dep.toFixed(2)},${r.closing.toFixed(2)},${r.count}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IT_Block_Reconciliation_FY_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Asset Management</h1>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Asset
        </Button>
      </div>

      <Tabs defaultValue="register" className="flex-1 flex flex-col min-h-0">
        <TabsList>
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation Schedule</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Tracker</TabsTrigger>
          <TabsTrigger value="itblock">IT Block (Tax)</TabsTrigger>
        </TabsList>

        {/* TAB 1 — Asset Register */}
        <TabsContent value="register" className="flex-1 min-h-0 overflow-auto">
          <Card className="p-4">
            <div className="flex gap-2 mb-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                  <SelectItem value="written_off">Written off</SelectItem>
                  <SelectItem value="under_repair">Under repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No assets yet. Click "Add Asset" to start.</TableCell></TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.asset_code}</TableCell>
                      <TableCell>{a.asset_name}</TableCell>
                      <TableCell className="text-xs">{a.category.replace(/_/g, " ")}</TableCell>
                      <TableCell>{new Date(a.purchase_date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right">{formatINR(a.purchase_cost)}</TableCell>
                      <TableCell className="text-right">{formatINR(a.current_book_value ?? a.purchase_cost)}</TableCell>
                      <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedId(a.id)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 2 — Depreciation Schedule */}
        <TabsContent value="depreciation" className="flex-1 min-h-0 overflow-auto">
          <Card className="p-4">
            <div className="flex gap-2 mb-3 items-center">
              <Label>Asset:</Label>
              <Select value={selectedId || ""} onValueChange={setSelectedId}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Select an asset" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.asset_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selected && (
                <Button onClick={() => postDepreciation(selected)} disabled={posting}>
                  Post Annual Depreciation
                </Button>
              )}
            </div>

            {selected ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
                  <div><span className="text-muted-foreground">Method:</span> <span className="font-semibold uppercase">{selected.depreciation_method}</span></div>
                  <div><span className="text-muted-foreground">Cost:</span> {formatINR(selected.purchase_cost)}</div>
                  <div><span className="text-muted-foreground">Life:</span> {selected.useful_life_years} yrs</div>
                  <div><span className="text-muted-foreground">Salvage:</span> {formatINR(selected.salvage_value || 0)}</div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">Opening BV</TableHead>
                      <TableHead className="text-right">Depreciation</TableHead>
                      <TableHead className="text-right">Closing BV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildSchedule(selected).map((r) => (
                      <TableRow key={r.year}>
                        <TableCell>Year {r.year}</TableCell>
                        <TableCell className="text-right">{formatINR(r.openingBV)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatINR(r.dep)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatINR(r.closingBV)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Select an asset to view its depreciation schedule.</p>
            )}
          </Card>
        </TabsContent>

        {/* TAB 3 — Insurance Tracker */}
        <TabsContent value="insurance" className="flex-1 min-h-0 overflow-auto">
          <Card className="p-4">
            {renewalDueCount > 0 && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{renewalDueCount} insurance policy(ies) due for renewal within 30 days.</span>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Policy #</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.filter((a) => a.insurance_policy_number).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No insured assets.</TableCell></TableRow>
                ) : (
                  assets.filter((a) => a.insurance_policy_number).map((a) => {
                    const st = insuranceStatus(a.insurance_expiry_date);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{a.asset_code} - {a.asset_name}</TableCell>
                        <TableCell className="font-mono text-xs">{a.insurance_policy_number}</TableCell>
                        <TableCell>{a.insurance_expiry_date ? new Date(a.insurance_expiry_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell className="text-right">{a.insurance_premium ? formatINR(a.insurance_premium) : "-"}</TableCell>
                        <TableCell>
                          {st && (
                            <Badge
                              className={
                                st.label === "Expired"
                                  ? "bg-destructive text-destructive-foreground"
                                  : (st as any).amber
                                  ? "bg-amber-500 text-white"
                                  : "bg-green-600 text-white"
                              }
                            >
                              {st.label}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 4 — IT Block (Tax) */}
        <TabsContent value="itblock" className="flex-1 min-h-0 overflow-auto">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-semibold">IT Block Reconciliation — FY {new Date().getFullYear()}</h3>
                <p className="text-xs text-muted-foreground">Per Indian Income Tax Act, Section 32 (Block of Assets - WDV method)</p>
              </div>
              <Button variant="outline" onClick={exportITBlockCSV}>
                <Download className="h-4 w-4 mr-1" /> Export for CA
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead className="text-right">Opening WDV</TableHead>
                  <TableHead className="text-right">Additions</TableHead>
                  <TableHead className="text-right">Disposals</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Closing WDV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itBlockReconciliation.map((r) => (
                  <TableRow key={r.block}>
                    <TableCell className="font-medium">{r.block}</TableCell>
                    <TableCell>{r.rate}%</TableCell>
                    <TableCell>{r.count}</TableCell>
                    <TableCell className="text-right">{formatINR(r.opening)}</TableCell>
                    <TableCell className="text-right">{formatINR(r.additions)}</TableCell>
                    <TableCell className="text-right">{formatINR(r.disposals)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatINR(r.dep)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatINR(r.closing)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Asset Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Fixed Asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Asset Code *</Label>
              <Input value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} />
            </div>
            <div>
              <Label>Asset Name *</Label>
              <Input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div>
              <Label>Purchase Cost (₹) *</Label>
              <Input type="number" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} />
            </div>
            <div>
              <Label>Useful Life (years)</Label>
              <Input type="number" value={form.useful_life_years} onChange={(e) => setForm({ ...form, useful_life_years: e.target.value })} />
            </div>
            <div>
              <Label>Salvage Value (₹)</Label>
              <Input type="number" value={form.salvage_value} onChange={(e) => setForm({ ...form, salvage_value: e.target.value })} />
            </div>
            <div>
              <Label>Depreciation Method</Label>
              <Select value={form.depreciation_method} onValueChange={(v) => setForm({ ...form, depreciation_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slm">Straight Line (SLM)</SelectItem>
                  <SelectItem value="wdv">Written Down Value (WDV)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.depreciation_method === "wdv" && (
              <div>
                <Label>WDV Rate (%)</Label>
                <Input type="number" value={form.wdv_rate} onChange={(e) => setForm({ ...form, wdv_rate: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>IT Block Category</Label>
              <Select value={form.it_block_category} onValueChange={(v) => setForm({ ...form, it_block_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IT_BLOCKS.map((b) => <SelectItem key={b.key} value={b.key}>{b.key}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 border-t pt-3 mt-2">
              <h4 className="font-medium mb-2 text-sm">Insurance (optional)</h4>
            </div>
            <div>
              <Label>Policy Number</Label>
              <Input value={form.insurance_policy_number} onChange={(e) => setForm({ ...form, insurance_policy_number: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.insurance_expiry_date} onChange={(e) => setForm({ ...form, insurance_expiry_date: e.target.value })} />
            </div>
            <div>
              <Label>Annual Premium (₹)</Label>
              <Input type="number" value={form.insurance_premium} onChange={(e) => setForm({ ...form, insurance_premium: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selected && false} onOpenChange={() => setSelectedId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.asset_name}</DialogTitle></DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetsPage;
