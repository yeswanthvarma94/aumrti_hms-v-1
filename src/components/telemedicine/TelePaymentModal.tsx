import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { autoPostJournalEntry } from "@/lib/accounting";
import { logAudit } from "@/lib/auditLog";
import { IndianRupee, CreditCard } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  hospitalId: string;
  onPaid: () => void;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const TelePaymentModal: React.FC<Props> = ({ open, onOpenChange, session, hospitalId, onPaid }) => {
  const { toast } = useToast();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("upi");
  const [razorpayId, setRazorpayId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !session?.bill_id) return;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("bills")
        .select("*")
        .eq("id", session.bill_id)
        .maybeSingle();
      if (error) {
        console.error("Failed to load bill:", error.message);
        toast({ title: "Could not load bill", variant: "destructive" });
      }
      setBill(data || null);
      setLoading(false);
    })();
  }, [open, session?.bill_id, toast]);

  const handleConfirm = async () => {
    if (!bill || !hospitalId) return;
    if (paymentMode === "razorpay" && !razorpayId.trim()) {
      toast({ title: "Enter Razorpay payment ID", variant: "destructive" });
      return;
    }
    setSaving(true);

    const totalAmount = Number(bill.total_amount || bill.patient_payable || 0);
    const billNumber = bill.bill_number;
    const doctorName =
      session.doctor_name || session.doctors?.full_name || "Doctor";
    const patientName = session.patients?.full_name || "Patient";
    const patientPhone = session.patient_phone || session.patients?.phone || "";

    try {
      // 1. Insert bill_payments row
      const { data: authData } = await supabase.auth.getUser();
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authData?.user?.id || "")
        .maybeSingle();
      const userId = userRow?.id || null;

      const { error: payErr } = await (supabase as any).from("bill_payments").insert({
        hospital_id: hospitalId,
        bill_id: bill.id,
        amount: totalAmount,
        payment_mode: paymentMode === "razorpay" ? "upi" : paymentMode,
        payment_date: new Date().toISOString().split("T")[0],
        payment_time: new Date().toTimeString().split(" ")[0],
        transaction_id: razorpayId || null,
        gateway_reference: paymentMode === "razorpay" ? "razorpay" : null,
        received_by: userId,
        notes: `Telemedicine consult — ${patientName} / Dr ${doctorName}`,
      });

      if (payErr) {
        console.error("Bill payment insert failed:", payErr.message);
        toast({ title: "Failed to record payment", description: payErr.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // 2. Update bill payment_status → paid
      const { error: billErr } = await (supabase as any)
        .from("bills")
        .update({
          payment_status: "paid",
          paid_amount: totalAmount,
          balance_due: 0,
        })
        .eq("id", bill.id);

      if (billErr) {
        console.error("Bill update failed:", billErr.message);
        toast({ title: "Failed to mark bill paid", variant: "destructive" });
        setSaving(false);
        return;
      }

      // 3. Update teleconsult_sessions — store payment metadata in notes (schema-tolerant)
      const paymentMeta = `\n[Payment confirmed ${new Date().toISOString()}] mode=${paymentMode}${
        razorpayId ? ` razorpay_id=${razorpayId}` : ""
      } bill=${billNumber} amt=${totalAmount}`;
      const newNotes = `${session.notes || ""}${paymentMeta}`;

      // Best-effort: write the spec'd extra columns if they exist (cast to any to bypass typed schema)
      const teleUpdate: any = {
        bill_generated: true,
        bill_id: bill.id,
        notes: newNotes,
      };
      try {
        teleUpdate.payment_status = "paid";
        teleUpdate.payment_method = paymentMode;
        teleUpdate.razorpay_payment_id = razorpayId || null;
        teleUpdate.paid_at = new Date().toISOString();
      } catch (_) {
        /* noop */
      }
      const { error: sessErr } = await (supabase as any)
        .from("teleconsult_sessions")
        .update(teleUpdate)
        .eq("id", session.id);
      if (sessErr) {
        // Retry without unsupported columns
        console.warn("Session update with extra cols failed, retrying with safe set:", sessErr.message);
        await (supabase as any)
          .from("teleconsult_sessions")
          .update({ bill_generated: true, bill_id: bill.id, notes: newNotes })
          .eq("id", session.id);
      }

      // 4. Auto-post journal entry — never block payment confirmation on failure
      try {
        await autoPostJournalEntry({
          triggerEvent: "bill_finalized_telemedicine",
          sourceModule: "telemedicine",
          sourceId: bill.id,
          amount: totalAmount,
          description: `Telemedicine Consultation - Bill ${billNumber} - Dr ${doctorName}`,
          hospitalId,
          postedBy: userId || "",
        });
      } catch (jerr: any) {
        console.error("Journal entry posting failed:", jerr?.message || jerr);
        toast({
          title: "Background sync warning",
          description: "Payment recorded but journal entry failed. Billing staff please review.",
          variant: "destructive",
        });
      }

      // 5. Audit log
      await logAudit({
        action: "telemedicine_payment_confirmed",
        module: "telemedicine",
        entityType: "bill",
        entityId: bill.id,
        details: {
          bill_number: billNumber,
          amount: totalAmount,
          payment_method: paymentMode,
          razorpay_payment_id: razorpayId || null,
          session_id: session.id,
          patient_name: patientName,
          doctor_name: doctorName,
        },
      });

      // 6. WhatsApp receipt (wa.me deep link)
      if (patientPhone) {
        const msg =
          `Dear ${patientName}, your telemedicine consultation with Dr ${doctorName} has been confirmed. ` +
          `Bill No: ${billNumber}. Amount Paid: ₹${totalAmount.toLocaleString("en-IN")}. Thank you.`;
        const clean = String(patientPhone).replace(/\D/g, "");
        const intl = clean.startsWith("91") ? clean : `91${clean}`;
        window.open(
          `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }

      toast({ title: `Payment confirmed: ${formatINR(totalAmount)}` });
      onPaid();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard size={18} /> Confirm Telemedicine Payment
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading bill…</p>
        ) : !bill ? (
          <p className="text-sm text-destructive py-6 text-center">No linked bill found for this session.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Bill No</p>
              <p className="text-sm font-mono font-bold">{bill.bill_number}</p>
              <div className="flex items-center gap-1 mt-2">
                <IndianRupee size={14} />
                <span className="text-lg font-bold">
                  {Number(bill.total_amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay (Online)</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="net_banking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMode === "razorpay" && (
              <div>
                <Label>Razorpay Payment ID *</Label>
                <Input
                  placeholder="pay_XXXXXXXXXXXXX"
                  value={razorpayId}
                  onChange={(e) => setRazorpayId(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}
            {paymentMode !== "razorpay" && (
              <div>
                <Label>Reference / Txn ID (optional)</Label>
                <Input
                  placeholder="Reference number"
                  value={razorpayId}
                  onChange={(e) => setRazorpayId(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={saving || Number(bill.total_amount || 0) <= 0}
              className="w-full gap-2"
            >
              {saving ? "Confirming…" : `Confirm Payment ${formatINR(Number(bill.total_amount || 0))}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TelePaymentModal;
