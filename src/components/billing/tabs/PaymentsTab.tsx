import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { autoPostJournalEntry } from "@/lib/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { BillRecord } from "@/pages/billing/BillingPage";
import type { PaymentRecord } from "@/components/billing/BillEditor";

const PAYMENT_MODES = [
  { value: "cash", label: "💵 Cash" },
  { value: "upi", label: "📱 UPI" },
  { value: "card", label: "💳 Card" },
  { value: "net_banking", label: "🌐 Net Banking" },
  { value: "cheque", label: "💳 Cheque" },
  { value: "insurance", label: "🏥 Insurance" },
  { value: "advance_adjust", label: "🔄 Advance Adjust" },
];

interface PayRow {
  mode: string;
  amount: string;
  reference: string;
}

interface Props {
  bill: BillRecord;
  hospitalId: string | null;
  payments: PaymentRecord[];
  onRefresh: () => void;
}

const PaymentsTab: React.FC<Props> = ({ bill, hospitalId, payments, onRefresh }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<PayRow[]>([{ mode: "cash", amount: String(bill.balance_due), reference: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const addRow = () => setRows([...rows, { mode: "cash", amount: "", reference: "" }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof PayRow, value: string) =>
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const totalCollecting = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const handleCollect = async () => {
    if (!hospitalId) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", user?.id || "")
      .maybeSingle();

    for (const row of rows) {
      const amt = Number(row.amount) || 0;
      if (amt <= 0) continue;
      await supabase.from("bill_payments").insert({
        hospital_id: hospitalId,
        bill_id: bill.id,
        payment_mode: row.mode,
        amount: amt,
        transaction_id: row.reference || null,
        received_by: userData?.id || null,
      });
    }

    const newPaid = bill.paid_amount + totalCollecting;
    const newBalance = Math.max(0, bill.patient_payable - newPaid);
    const newStatus = newBalance <= 0 ? "paid" : "partial";

    await supabase.from("bills").update({
      paid_amount: newPaid,
      balance_due: newBalance,
      payment_status: newStatus,
    }).eq("id", bill.id);

    toast({ title: `Payment of ₹${totalCollecting.toLocaleString("en-IN")} collected ✓` });
    setSubmitting(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Collect payment form */}
      {bill.balance_due > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-base font-bold mb-3">Amount to Collect: ₹{bill.balance_due.toLocaleString("en-IN")}</p>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={row.mode} onValueChange={(v) => updateRow(i, "mode", v)}>
                  <SelectTrigger className="w-44 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number" placeholder="₹ Amount" value={row.amount}
                  onChange={(e) => updateRow(i, "amount", e.target.value)}
                  className="w-32 h-9 text-xs"
                />
                <Input
                  placeholder="Ref / Txn ID" value={row.reference}
                  onChange={(e) => updateRow(i, "reference", e.target.value)}
                  className="flex-1 h-9 text-xs"
                />
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-destructive"><X size={14} /></button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addRow} className="text-xs text-primary mt-2 flex items-center gap-1">
            <Plus size={12} /> Add split payment
          </button>

          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Collecting: ₹{totalCollecting.toLocaleString("en-IN")}
              {totalCollecting > bill.balance_due && (
                <span className="text-success ml-2">Change: ₹{(totalCollecting - bill.balance_due).toLocaleString("en-IN")}</span>
              )}
            </span>
            <Button onClick={handleCollect} disabled={submitting || totalCollecting <= 0} className="h-10">
              {submitting ? "Processing..." : "Collect & Record Payment"}
            </Button>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div>
        <h3 className="text-sm font-bold mb-2">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-[11px] font-bold uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="px-3 py-2 text-xs">{p.payment_date}</td>
                  <td className="px-3 py-2 text-xs capitalize">{p.payment_mode.replace("_", " ")}</td>
                  <td className="px-3 py-2 text-right font-bold">₹{p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.transaction_id || "—"}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={2} className="px-3 py-2">Total Paid</td>
                <td className="px-3 py-2 text-right text-success">
                  ₹{payments.reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PaymentsTab;
