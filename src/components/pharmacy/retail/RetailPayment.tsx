import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Banknote, Smartphone, CreditCard, Building2, Printer, MessageSquare, FileText, RotateCcw, Check, Loader2 } from "lucide-react";
import type { CartItem } from "./RetailCart";
import { createPatientRecord, findPatientByPhone } from "@/lib/patient-records";
import { autoPostJournalEntry } from "@/lib/accounting";

type PaymentMode = "cash" | "upi" | "card" | "credit";

const PRESETS = [100, 200, 500, 1000];

interface ReceiptData {
  dispensingNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netTotal: number;
  paymentMode: string;
  amountReceived: number;
  change: number;
  customerName: string;
  date: string;
}

interface Props {
  hospitalId: string;
  items: CartItem[];
  customerId: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  gstAmount: number;
  netTotal: number;
  customerPhone: string;
  customerName: string;
  onSaleComplete: () => void;
}

const RetailPayment: React.FC<Props> = ({
  hospitalId, items, customerId, subtotal, discountPercent, discountAmount, gstAmount, netTotal,
  customerPhone, customerName, onSaleComplete,
}) => {
  const { toast } = useToast();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const change = Math.max(0, amountReceived - netTotal);
  const hasScheduleH = items.some(i => i.drug_schedule === "H" || i.drug_schedule === "H1");
  const canComplete = items.length > 0 && netTotal > 0;

  const handleCompleteSale = async () => {
    if (!canComplete) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!userData) throw new Error("User not found");

      let patientId = customerId;
      let resolvedCustomerName = customerName.trim() || "Walk-in Customer";

      if (!patientId && customerPhone.length >= 10) {
        const existing = await findPatientByPhone(hospitalId, customerPhone);
        if (existing) {
          patientId = existing.id;
          resolvedCustomerName = existing.full_name;
        }
      }

      if (!patientId) {
        const createdPatient = await createPatientRecord({
          hospitalId,
          fullName: resolvedCustomerName,
          phone: customerPhone || undefined,
        });

        patientId = createdPatient.id;
        resolvedCustomerName = createdPatient.full_name;
      }

      const dispNum = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;

      const { data: disp, error: dispErr } = await supabase
        .from("pharmacy_dispensing")
        .insert({
          hospital_id: hospitalId,
          dispensing_number: dispNum,
          patient_id: patientId,
          dispensed_by: userData.id,
          dispensing_type: "retail",
          status: "dispensed",
          total_amount: subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          gst_amount: gstAmount,
          net_amount: netTotal,
          payment_mode: paymentMode,
        })
        .select("id")
        .single();

      if (dispErr) throw dispErr;

      // Insert items and deduct stock
      for (const item of items) {
        await supabase.from("pharmacy_dispensing_items").insert({
          hospital_id: hospitalId,
          dispensing_id: disp.id,
          drug_id: item.drug_id,
          batch_id: item.batch_id,
          drug_name: item.drug_name,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          quantity_requested: item.qty,
          quantity_dispensed: item.qty,
          unit_price: item.unit_price,
          gst_percent: item.gst_percent,
          total_price: item.unit_price * item.qty,
          is_ndps: item.is_ndps,
        });

        // Deduct batch stock
        const { data: batch } = await supabase
          .from("drug_batches")
          .select("quantity_available")
          .eq("id", item.batch_id)
          .single();

        if (batch) {
          await supabase
            .from("drug_batches")
            .update({ quantity_available: Math.max(0, batch.quantity_available - item.qty) })
            .eq("id", item.batch_id);
        }

        // NDPS register
        if (item.is_ndps) {
          const { data: lastEntry } = await supabase
            .from("ndps_register")
            .select("balance_after")
            .eq("drug_id", item.drug_id)
            .eq("hospital_id", hospitalId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          await supabase.from("ndps_register").insert({
            hospital_id: hospitalId,
            drug_id: item.drug_id,
            drug_name: item.drug_name,
            drug_schedule: item.drug_schedule || "X",
            transaction_type: "issue",
            quantity: item.qty,
            balance_after: Math.max(0, Number(lastEntry?.balance_after || 0) - item.qty),
            patient_name: resolvedCustomerName,
            pharmacist_id: userData.id,
          });
        }
      }

      setReceipt({
        dispensingNumber: dispNum,
        items,
        subtotal,
        discountAmount,
        gstAmount,
        netTotal,
        paymentMode,
        amountReceived: paymentMode === "cash" ? amountReceived : netTotal,
        change: paymentMode === "cash" ? change : 0,
        customerName: resolvedCustomerName,
        date: new Date().toLocaleString("en-IN"),
      });

      toast({ title: `✓ Sale complete — ₹${netTotal.toFixed(0)}` });

      // Auto-post journal entry for retail sale
      await autoPostJournalEntry({
        triggerEvent: "pharmacy_retail_sale",
        sourceModule: "pharmacy",
        sourceId: disp.id,
        amount: netTotal,
        description: `Retail Sale ${dispNum}`,
        hospitalId,
        postedBy: userData.id,
      });
    } catch (err: any) {
      toast({ title: "Sale failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleWhatsApp = () => {
    if (!receipt || !customerPhone) return;
    const lines = receipt.items.map(i => `• ${i.drug_name} ×${i.qty} = ₹${(i.unit_price * i.qty).toFixed(0)}`);
    const msg = `🏥 *Pharmacy Receipt*\n*${receipt.dispensingNumber}*\nDate: ${receipt.date}\n\n💊 *Items:*\n${lines.join("\n")}\n\n💰 *Total: ₹${receipt.netTotal.toFixed(0)}*\n${receipt.paymentMode.toUpperCase()}\n${receipt.change > 0 ? `Change: ₹${receipt.change.toFixed(0)}` : ""}\n\nThank you! 🙏`;
    window.open(`https://wa.me/91${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`);
  };

  const handlePrint = () => window.print();

  // Receipt view
  if (receipt) {
    return (
      <div className="w-[320px] flex-shrink-0 bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-green-50 dark:bg-green-950/20 text-center">
          <Check size={24} className="mx-auto text-green-600 mb-1" />
          <p className="text-sm font-bold text-green-700 dark:text-green-400">Sale Complete!</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 text-center">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Pharmacy Receipt</p>
              <p className="text-xs font-mono text-foreground">{receipt.dispensingNumber}</p>
              <p className="text-[10px] text-muted-foreground">{receipt.date}</p>

              <div className="border-t border-dashed border-border pt-3 space-y-1 text-left">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate flex-1">{item.drug_name} ×{item.qty}</span>
                    <span className="ml-2 font-medium">₹{(item.unit_price * item.qty).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-border pt-2 space-y-1 text-left text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>₹{receipt.subtotal.toFixed(0)}</span>
                </div>
                {receipt.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span><span>-₹{receipt.discountAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>GST</span><span>₹{receipt.gstAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-border">
                  <span>Total</span><span>₹{receipt.netTotal.toFixed(0)}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-left pt-1">
                <p>Payment: {receipt.paymentMode.toUpperCase()}</p>
                {receipt.change > 0 && <p className="font-bold text-green-600">Change: ₹{receipt.change.toFixed(0)}</p>}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 p-3 border-t border-border grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={handlePrint}>
            <Printer size={14} className="mr-1" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9"
            disabled={!customerPhone}
            onClick={handleWhatsApp}
          >
            <MessageSquare size={14} className="mr-1" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={handlePrint}>
            <FileText size={14} className="mr-1" /> GST Invoice
          </Button>
          <Button size="sm" className="text-xs h-9" onClick={onSaleComplete}>
            <RotateCcw size={14} className="mr-1" /> New Sale
          </Button>
        </div>
      </div>
    );
  }

  // Payment mode selection
  const modes: { key: PaymentMode; icon: React.ReactNode; label: string }[] = [
    { key: "cash", icon: <Banknote size={18} />, label: "Cash" },
    { key: "upi", icon: <Smartphone size={18} />, label: "UPI" },
    { key: "card", icon: <CreditCard size={18} />, label: "Card" },
    { key: "credit", icon: <Building2 size={18} />, label: "Credit" },
  ];

  return (
    <div className="w-[320px] flex-shrink-0 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Payment Methods */}
      <div className="flex-shrink-0 p-4">
        <p className="text-[11px] font-bold uppercase text-muted-foreground mb-2.5">Payment Method</p>
        <div className="grid grid-cols-2 gap-2">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => { setPaymentMode(m.key); if (m.key === "cash") setAmountReceived(0); }}
              className={cn(
                "flex flex-col items-center justify-center h-14 rounded-lg border-[1.5px] transition-all active:scale-[0.97] text-sm font-bold",
                paymentMode === m.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-foreground hover:border-primary/30"
              )}
            >
              {m.icon}
              <span className="text-xs mt-1">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Details */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          {paymentMode === "cash" && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount Received</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={amountReceived || ""}
                    onChange={e => setAmountReceived(parseFloat(e.target.value) || 0)}
                    className="pl-8 h-12 text-xl font-bold text-center"
                    placeholder="0"
                  />
                </div>
              </div>
              {amountReceived >= netTotal && netTotal > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Change to Return</p>
                  <p className="text-xl font-bold text-green-600">₹{change.toFixed(0)}</p>
                </div>
              )}
              <div className="grid grid-cols-4 gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => setAmountReceived(p)}
                    className="h-9 rounded-lg bg-muted text-xs font-bold text-foreground hover:bg-muted/80 active:scale-[0.97]"
                  >₹{p}</button>
                ))}
              </div>
              <button
                onClick={() => setAmountReceived(Math.ceil(netTotal))}
                className="w-full h-8 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-muted/80 active:scale-[0.97]"
              >Exact ₹{Math.ceil(netTotal)}</button>
            </div>
          )}

          {paymentMode === "upi" && (
            <div className="text-center space-y-3 py-4">
              <div className="w-40 h-40 mx-auto bg-muted/30 rounded-xl border border-dashed border-border flex items-center justify-center">
                <div className="text-center">
                  <Smartphone size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">Scan to pay</p>
                  <p className="text-lg font-bold text-foreground mt-1">₹{netTotal.toFixed(0)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Configure Razorpay in Settings for QR</p>
            </div>
          )}

          {paymentMode === "card" && (
            <div className="space-y-3 py-4 text-center">
              <CreditCard size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Swipe card on terminal</p>
              <Input placeholder="Transaction ID (optional)" className="h-9 text-xs" />
            </div>
          )}

          {paymentMode === "credit" && (
            <div className="space-y-3 py-4 text-center">
              <Building2 size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Credit to patient account</p>
              <p className="text-[10px] text-muted-foreground">Requires linked patient</p>
            </div>
          )}

          {/* Schedule H warning */}
          {hasScheduleH && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Prescription required for {items.filter(i => i.drug_schedule === "H" || i.drug_schedule === "H1").length} drug(s)
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Complete Sale */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <Button
          className="w-full h-14 text-base font-bold rounded-xl"
          disabled={!canComplete || processing || (paymentMode === "cash" && amountReceived < netTotal && amountReceived > 0)}
          onClick={handleCompleteSale}
        >
          {processing ? (
            <><Loader2 size={18} className="mr-2 animate-spin" /> Processing…</>
          ) : (
            <>✓ Complete Sale — ₹{netTotal.toFixed(0)}</>
          )}
        </Button>
      </div>

      {/* Session bar */}
      <div className="flex-shrink-0 h-6 bg-muted/30 border-t border-border/50 px-4 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Retail Counter</span>
        <span>{new Date().toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
};

export default RetailPayment;
