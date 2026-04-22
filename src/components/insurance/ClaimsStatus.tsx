import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { differenceInDays, format } from "date-fns";
import EmptyState from "@/components/EmptyState";
import AppealLetterModal from "./AppealLetterModal";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import BundledBillsView from "./BundledBillsView";

interface Claim {
  id: string;
  claim_number: string | null;
  patient_name: string;
  tpa_name: string;
  claimed_amount: number;
  approved_amount: number | null;
  settled_amount: number | null;
  status: string;
  submitted_at: string | null;
  denial_reason: string | null;
  bill_id: string | null;
  documents_submitted: any;
}

const statusOptions = ["all", "submitted", "under_review", "approved", "partially_approved", "rejected", "settled", "written_off"];

const DENIAL_CATEGORIES = ["documentation_missing", "clinical_not_justified", "policy_exclusion", "duplicate_claim", "technical_error", "other"];
const DENIAL_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--destructive))"];

const ClaimsStatus: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [appealClaim, setAppealClaim] = useState<Claim | null>(null);
  const [denialModal, setDenialModal] = useState<Claim | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [denialCategory, setDenialCategory] = useState("");
  const [denialStats, setDenialStats] = useState<{ category: string; count: number }[]>([]);
  const [topDenialsByTPA, setTopDenialsByTPA] = useState<{ tpa: string; reasons: string[] }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); loadDenialStats(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    let q = supabase.from("insurance_claims").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;

    if (!data?.length) { setClaims([]); setLoading(false); return; }

    const patientIds = [...new Set(data.map(c => c.patient_id))];
    const { data: patients } = await supabase.from("patients").select("id, full_name").in("id", patientIds);
    const pMap = Object.fromEntries((patients || []).map(p => [p.id, p.full_name]));

    setClaims(data.map(c => ({
      id: c.id,
      claim_number: c.claim_number,
      patient_name: pMap[c.patient_id] || "Unknown",
      tpa_name: c.tpa_name,
      claimed_amount: Number(c.claimed_amount),
      approved_amount: c.approved_amount ? Number(c.approved_amount) : null,
      settled_amount: c.settled_amount ? Number(c.settled_amount) : null,
      status: c.status,
      submitted_at: c.submitted_at,
      denial_reason: c.denial_reason,
      bill_id: c.bill_id ?? null,
      documents_submitted: c.documents_submitted ?? null,
    })));
    setLoading(false);
  };

  const loadDenialStats = async () => {
    const { data: logs } = await supabase.from("denial_logs").select("category, denial_reason, claim_id");
    if (!logs?.length) return;
    
    // Category breakdown
    const catMap: Record<string, number> = {};
    logs.forEach(l => { const c = l.category || "other"; catMap[c] = (catMap[c] || 0) + 1; });
    setDenialStats(Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));

    // Top denials by TPA - need to join with insurance_claims
    const claimIds = [...new Set(logs.map(l => l.claim_id).filter(Boolean))];
    if (claimIds.length > 0) {
      const { data: claimData } = await supabase.from("insurance_claims").select("id, tpa_name").in("id", claimIds);
      const claimTpaMap = Object.fromEntries((claimData || []).map(c => [c.id, c.tpa_name]));
      const tpaReasons: Record<string, string[]> = {};
      logs.forEach(l => {
        const tpa = claimTpaMap[l.claim_id] || "Unknown";
        if (!tpaReasons[tpa]) tpaReasons[tpa] = [];
        if (l.denial_reason && !tpaReasons[tpa].includes(l.denial_reason)) tpaReasons[tpa].push(l.denial_reason);
      });
      setTopDenialsByTPA(Object.entries(tpaReasons).map(([tpa, reasons]) => ({ tpa, reasons: reasons.slice(0, 3) })));
    }
  };

  const logDenial = async (claim: Claim) => {
    if (!denialReason || !denialCategory) {
      toast({ title: "Please fill reason and category", variant: "destructive" });
      return;
    }
    const { data: userData } = await supabase.from("users").select("hospital_id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle();
    await supabase.from("denial_logs").insert({
      hospital_id: userData?.hospital_id || "",
      claim_id: claim.id,
      denial_reason: denialReason,
      category: denialCategory,
    });
    toast({ title: "Denial logged ✓" });
    setDenialModal(null);
    setDenialReason("");
    setDenialCategory("");
    loadDenialStats();
  };

  const recordSettlement = async (claim: Claim) => {
    const amount = prompt("Enter settled amount (₹):");
    if (!amount) return;
    await supabase.from("insurance_claims").update({
      settled_amount: Number(amount),
      settlement_date: new Date().toISOString().slice(0, 10),
      status: "settled",
    }).eq("id", claim.id);
    toast({ title: "Settlement recorded ✓" });
    loadData();
  };

  const writeOff = async (claim: Claim) => {
    const reason = prompt("Reason for write-off:");
    if (!reason) return;
    await supabase.from("insurance_claims").update({
      status: "written_off",
      denial_reason: reason,
    }).eq("id", claim.id);
    toast({ title: "Claim written off" });
    loadData();
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      submitted: "bg-blue-50 text-blue-700",
      under_review: "bg-purple-50 text-purple-700",
      approved: "bg-emerald-50 text-emerald-700",
      partially_approved: "bg-amber-50 text-amber-700",
      rejected: "bg-red-50 text-red-700",
      settled: "bg-emerald-100 text-emerald-800",
      written_off: "bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={`text-[10px] capitalize ${m[s] || ""}`}>{s.replace("_", " ")}</Badge>;
  };

  // KPI counts
  const counts = statusOptions.slice(1).reduce((acc, s) => {
    acc[s] = claims.filter(c => c.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {/* KPI badges */}
      <div className="flex gap-2 flex-wrap">
        {statusOptions.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {s === "all" ? "All" : `${s.replace("_", " ")} ${filter === "all" && counts[s] ? `(${counts[s]})` : ""}`}
          </button>
        ))}
      </div>

      <div className="bg-background rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] w-8" />
              <TableHead className="text-[11px]">Claim #</TableHead>
              <TableHead className="text-[11px]">Patient</TableHead>
              <TableHead className="text-[11px]">TPA</TableHead>
              <TableHead className="text-[11px]">Claimed</TableHead>
              <TableHead className="text-[11px]">Approved</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px]">Days</TableHead>
              <TableHead className="text-[11px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm py-8">Loading...</TableCell></TableRow>
            ) : claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0 h-48">
                  <EmptyState icon="🏥" title="No claims to show" description="Insurance claims from billing will appear here" />
                </TableCell>
              </TableRow>
            ) : claims.map(c => {
              const bundle = c.documents_submitted && typeof c.documents_submitted === "object" ? c.documents_submitted : null;
              const bundledCount = Array.isArray(bundle?.included_bill_ids) ? bundle.included_bill_ids.length : 0;
              const isExpanded = expandedId === c.id;
              return (
                <React.Fragment key={c.id}>
                  <TableRow>
                    <TableCell className="px-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        aria-label={isExpanded ? "Collapse" : "Expand bundled bills"}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span>{c.claim_number || "—"}</span>
                        {bundledCount > 1 && (
                          <Badge variant="outline" className="text-[9px] gap-0.5 px-1 py-0 h-4">
                            <Package size={9} /> {bundledCount}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] font-medium">{c.patient_name}</TableCell>
                    <TableCell className="text-xs">{c.tpa_name}</TableCell>
                    <TableCell className="text-[13px] font-bold tabular-nums">₹{c.claimed_amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {c.approved_amount ? `₹${c.approved_amount.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {c.submitted_at ? differenceInDays(new Date(), new Date(c.submitted_at)) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(c.status === "approved" || c.status === "partially_approved") && (
                          <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => recordSettlement(c)}>💰 Settle</Button>
                        )}
                        {c.status === "rejected" && (
                          <>
                            <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setAppealClaim(c)}>📝 Appeal</Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setDenialModal(c)}>📋 Log Denial</Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-6">Resubmit</Button>
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => writeOff(c)}>Write Off</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/20 p-3">
                        <BundledBillsView claimId={c.id} bundle={bundle} fallbackBillId={c.bill_id} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AppealLetterModal
        open={!!appealClaim}
        onOpenChange={(open) => !open && setAppealClaim(null)}
        claim={appealClaim}
      />

      {/* Denial Log Modal */}
      <Dialog open={!!denialModal} onOpenChange={(open) => !open && setDenialModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Log Denial Details</DialogTitle>
          </DialogHeader>
          {denialModal && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Claim: {denialModal.claim_number || "—"} · {denialModal.tpa_name} · ₹{denialModal.claimed_amount.toLocaleString("en-IN")}
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Denial Category</Label>
                <Select value={denialCategory} onValueChange={setDenialCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {DENIAL_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Denial Reason</Label>
                <Input className="mt-1" value={denialReason} onChange={e => setDenialReason(e.target.value)} placeholder="Specific reason from TPA" />
              </div>
              <Button onClick={() => logDenial(denialModal)} className="w-full">Log Denial</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Denial Analysis Section */}
      {denialStats.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background rounded-lg border border-border p-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-3">Denial Categories</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={denialStats} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={60} innerRadius={30} label={({ category, count }) => `${(category as string).replace(/_/g, " ")} (${count})`} labelLine={false}>
                  {denialStats.map((_, i) => (
                    <Cell key={i} fill={DENIAL_COLORS[i % DENIAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, name.replace(/_/g, " ")]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-background rounded-lg border border-border p-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-3">Top Denial Reasons by TPA</p>
            <div className="space-y-3">
              {topDenialsByTPA.map(t => (
                <div key={t.tpa}>
                  <p className="text-[13px] font-medium text-foreground">{t.tpa}</p>
                  <ul className="ml-3 mt-1 space-y-0.5">
                    {t.reasons.map((r, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {topDenialsByTPA.length === 0 && <p className="text-xs text-muted-foreground">No denial data yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimsStatus;
