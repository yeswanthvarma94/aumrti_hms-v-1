import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInDays } from "date-fns";

interface AgeingBucket {
  tpa: string;
  range0_30: number;
  range31_60: number;
  range61_90: number;
  range90plus: number;
  total: number;
  count: number;
}

const TPAAgeing: React.FC = () => {
  const [buckets, setBuckets] = useState<AgeingBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: claims } = await supabase
      .from("insurance_claims")
      .select("tpa_name, claimed_amount, submitted_at, status")
      .in("status", ["submitted", "under_review", "approved", "partially_approved"]);

    if (!claims?.length) { setBuckets([]); setLoading(false); return; }

    const tpaMap: Record<string, AgeingBucket> = {};
    claims.forEach(c => {
      if (!tpaMap[c.tpa_name]) {
        tpaMap[c.tpa_name] = { tpa: c.tpa_name, range0_30: 0, range31_60: 0, range61_90: 0, range90plus: 0, total: 0, count: 0 };
      }
      const b = tpaMap[c.tpa_name];
      const days = c.submitted_at ? differenceInDays(new Date(), new Date(c.submitted_at)) : 0;
      const amt = Number(c.claimed_amount);
      b.total += amt;
      b.count += 1;
      if (days <= 30) b.range0_30 += amt;
      else if (days <= 60) b.range31_60 += amt;
      else if (days <= 90) b.range61_90 += amt;
      else b.range90plus += amt;
    });

    setBuckets(Object.values(tpaMap).sort((a, b) => b.total - a.total));
    setLoading(false);
  };

  const fmt = (n: number) => n > 0 ? `₹${(n / 100000).toFixed(1)}L` : "—";
  const totals = buckets.reduce((acc, b) => ({
    r0: acc.r0 + b.range0_30, r1: acc.r1 + b.range31_60, r2: acc.r2 + b.range61_90, r3: acc.r3 + b.range90plus, t: acc.t + b.total, c: acc.c + b.count
  }), { r0: 0, r1: 0, r2: 0, r3: 0, t: 0, c: 0 });

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "0–30 days", value: totals.r0, color: "text-emerald-600" },
          { label: "31–60 days", value: totals.r1, color: "text-amber-600" },
          { label: "61–90 days", value: totals.r2, color: "text-orange-600" },
          { label: "90+ days", value: totals.r3, color: "text-destructive" },
        ].map(c => (
          <Card key={c.label}>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-[11px] text-muted-foreground font-medium">{c.label}</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3"><p className={`text-lg font-bold tabular-nums ${c.color}`}>{fmt(c.value)}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Ageing Table */}
      <div className="bg-background rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">TPA / Insurer</TableHead>
              <TableHead className="text-[11px] text-right">0–30 days</TableHead>
              <TableHead className="text-[11px] text-right">31–60 days</TableHead>
              <TableHead className="text-[11px] text-right">61–90 days</TableHead>
              <TableHead className="text-[11px] text-right">90+ days</TableHead>
              <TableHead className="text-[11px] text-right">Total</TableHead>
              <TableHead className="text-[11px] text-right">Claims</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">No outstanding claims</TableCell></TableRow>
            ) : (
              <>
                {buckets.map(b => (
                  <TableRow key={b.tpa}>
                    <TableCell className="text-[13px] font-medium">{b.tpa}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-emerald-600">{fmt(b.range0_30)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-amber-600">{fmt(b.range31_60)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-orange-600">{fmt(b.range61_90)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-destructive">{fmt(b.range90plus)}</TableCell>
                    <TableCell className="text-right text-[13px] font-bold tabular-nums">{fmt(b.total)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{b.count}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="text-[13px]">Total</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(totals.r0)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(totals.r1)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(totals.r2)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(totals.r3)}</TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums">{fmt(totals.t)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{totals.c}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TPAAgeing;
