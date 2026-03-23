import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Copy, ExternalLink, Info } from "lucide-react";
import type { BillRecord } from "@/pages/billing/BillingPage";

interface Props {
  bill: BillRecord;
  hospitalName: string;
  hospitalPhone?: string;
  razorpayConfigured: boolean;
  onClose: () => void;
}

const PaymentLinkModal: React.FC<Props> = ({
  bill, hospitalName, hospitalPhone, razorpayConfigured, onClose,
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState(bill.balance_due);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const demoLink = `https://pay.hospital.app/bill/${bill.id.slice(0, 8)}`;
  const paymentLink = demoLink;

  const message = `🏥 *${hospitalName}*

Dear Patient,
Your bill #${bill.bill_number} is ready.

💰 *Amount Due: ₹${amount.toLocaleString("en-IN")}*

Pay securely online:
👉 ${paymentLink}

For queries: ${hospitalPhone || "Contact hospital"}`;

  const handleWhatsApp = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setSending(true);
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, "_blank");

    await supabase.from("bills").update({ payment_link_sent: true } as any).eq("id", bill.id);
    setSending(false);
    toast({ title: "Payment link sent on WhatsApp ✓" });
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentLink);
    toast({ title: "Payment link copied ✓" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Send Payment Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {bill.patient_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{bill.patient_name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-5">{bill.uhid}</Badge>
                <span className="text-[11px] font-mono text-muted-foreground">Bill #{bill.bill_number}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Amount (₹)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="text-lg font-bold h-12"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Patient Phone Number</Label>
            <Input
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={12}
            />
          </div>

          {!razorpayConfigured && (
            <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg p-3">
              <Info size={14} className="text-accent mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Configure Razorpay in Settings → Integrations for live payment links. Demo link shown for testing.
              </p>
            </div>
          )}

          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Message Preview</p>
            <pre className="text-[11px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {message}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
              <Copy size={14} /> Copy Link
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleWhatsApp}
              disabled={sending}
            >
              <MessageSquare size={14} /> Send on WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentLinkModal;
