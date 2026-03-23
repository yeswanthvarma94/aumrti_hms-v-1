import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { differenceInDays, format } from "date-fns";

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
}

const statusOptions = ["all", "submitted", "under_review", "approved", "partially_approved", "rejected", "settled", "written_off"];

const ClaimsStatus: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [filter]);

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
    })));
    setLoading(false);
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
              <TableRow><TableCell colSpan={8} className="text-center text-sm py-8">Loading...</TableCell></TableRow>
            ) : claims.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">No claims found</TableCell></TableRow>
            ) : claims.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.claim_number || "—"}</TableCell>
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
                        <Button size="sm" variant="outline" className="text-[10px] h-6">Resubmit</Button>
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => writeOff(c)}>Write Off</Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ClaimsStatus;
