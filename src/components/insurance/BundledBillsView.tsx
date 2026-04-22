import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { formatINR } from "@/lib/currency";

interface BillRow {
  id: string;
  bill_number: string;
  bill_type: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number | null;
  payment_status: string;
}

interface Props {
  claimId: string;
  /** Bundle metadata from insurance_claims.documents_submitted JSONB */
  bundle?: { included_bill_ids?: string[]; bills_summary?: any[] } | null;
  /** Fallback single bill_id when claim is not bundled */
  fallbackBillId?: string | null;
}

const statusTone = (s: string) => {
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "pending" || s === "unpaid") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
};

const labelForType = (t: string) => {
  const map: Record<string, string> = {
    ipd: "IPD", pharmacy: "Pharmacy", lab: "Laboratory", radiology: "Radiology",
    ot: "OT", blood_bank: "Blood Bank", dialysis: "Dialysis", nursing: "Nursing",
    ayush: "AYUSH", physio: "Physio", dental: "Dental", vaccination: "Vaccination",
    ivf: "IVF", package: "Package", telemedicine: "Telemedicine", opd: "OPD",
  };
  return map[t] || t;
};

const BundledBillsView: React.FC<Props> = ({ claimId, bundle, fallbackBillId }) => {
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = bundle?.included_bill_ids?.length ? bundle.included_bill_ids : (fallbackBillId ? [fallbackBillId] : []);
    if (ids.length === 0) {
      setBills([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, bill_number, bill_type, bill_date, total_amount, paid_amount, payment_status")
        .in("id", ids);
      if (error) {
        console.error("Bundled bills load failed:", error.message);
        setBills([]);
      } else {
        setBills((data || []) as BillRow[]);
      }
      setLoading(false);
    })();
  }, [claimId, bundle, fallbackBillId]);

  if (loading) {
    return <div className="text-[11px] text-muted-foreground py-2 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading bundled bills…</div>;
  }
  if (bills.length === 0) {
    return <div className="text-[11px] text-muted-foreground py-2">No bills linked to this claim.</div>;
  }

  const total = bills.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const paid = bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Package size={12} className="text-muted-foreground" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Bundled Bills ({bills.length})
        </p>
        <span className="text-[11px] text-muted-foreground">·</span>
        <span className="text-[11px] tabular-nums">Total {formatINR(total)} · Paid by insurer {formatINR(paid)}</span>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-2 py-1 font-semibold">Department</th>
              <th className="text-left px-2 py-1 font-semibold">Bill No</th>
              <th className="text-left px-2 py-1 font-semibold">Date</th>
              <th className="text-right px-2 py-1 font-semibold">Amount</th>
              <th className="text-right px-2 py-1 font-semibold">Insurer Paid</th>
              <th className="text-center px-2 py-1 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.id} className="border-t border-border/40">
                <td className="px-2 py-1">{labelForType(b.bill_type)}</td>
                <td className="px-2 py-1 font-mono text-[10px]">{b.bill_number}</td>
                <td className="px-2 py-1 text-muted-foreground">{new Date(b.bill_date).toLocaleDateString("en-IN")}</td>
                <td className="px-2 py-1 text-right tabular-nums font-medium">{formatINR(Number(b.total_amount || 0))}</td>
                <td className="px-2 py-1 text-right tabular-nums">{formatINR(Number(b.paid_amount || 0))}</td>
                <td className="px-2 py-1 text-center">
                  <Badge variant="outline" className={`text-[9px] capitalize ${statusTone(b.payment_status)}`}>
                    {b.payment_status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BundledBillsView;
