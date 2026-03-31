import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Receipt, Printer, MessageSquare, FileText, Send, Lock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RevenueIntelligencePanel from "@/components/billing/RevenueIntelligencePanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LineItemsTab from "@/components/billing/tabs/LineItemsTab";
import PaymentsTab from "@/components/billing/tabs/PaymentsTab";
import InsuranceTab from "@/components/billing/tabs/InsuranceTab";
import GSTInvoiceModal from "@/components/billing/GSTInvoiceModal";
import PaymentLinkModal from "@/components/billing/PaymentLinkModal";
import { useWhatsAppNotification } from "@/components/whatsapp/WhatsAppNotificationCard";
import { sendBillGenerated } from "@/lib/whatsapp-notifications";
import { validateGSTLineItems } from "@/lib/compliance-checks";
import { autoPostJournalEntry } from "@/lib/accounting";
import type { BillRecord } from "@/pages/billing/BillingPage";

export interface LineItem {
  id: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_rate: number;
  discount_percent: number;
  gst_percent: number;
  total_amount: number;
  source_module: string | null;
  service_id: string | null;
  hsn_code: string | null;
}

export interface PaymentRecord {
  id: string;
  payment_mode: string;
  amount: number;
  payment_date: string;
  transaction_id: string | null;
  notes: string | null;
}

const statusBadgeStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  final: "bg-primary/10 text-primary",
  unpaid: "bg-destructive/10 text-destructive",
  partial: "bg-accent/10 text-accent",
  paid: "bg-success/10 text-success",
};

interface Props {
  bill: BillRecord | null;
  hospitalId: string | null;
  onRefresh: () => void;
}

const BillEditor: React.FC<Props> = ({ bill, hospitalId, onRefresh }) => {
  const { toast } = useToast();
  const { show: showWaNotif, card: waCard } = useWhatsAppNotification();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showGstInvoice, setShowGstInvoice] = useState(false);
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState<any>(null);

  useEffect(() => {
    if (!hospitalId) return;
    supabase.from("hospitals").select("name, gstin, address").eq("id", hospitalId).maybeSingle()
      .then(({ data }) => setHospitalInfo(data));
  }, [hospitalId]);

  const fetchLineItems = useCallback(async () => {
    if (!bill) return;
    setLoadingItems(true);
    const { data } = await supabase
      .from("bill_line_items")
      .select("*")
      .eq("bill_id", bill.id)
      .order("created_at", { ascending: true });
    setLineItems(
      (data || []).map((d: any) => ({
        id: d.id,
        description: d.description,
        item_type: d.item_type,
        quantity: Number(d.quantity),
        unit_rate: Number(d.unit_rate),
        discount_percent: Number(d.discount_percent),
        gst_percent: Number(d.gst_percent),
        total_amount: Number(d.total_amount),
        source_module: d.source_module,
        service_id: d.service_id,
        hsn_code: d.hsn_code,
      }))
    );
    setLoadingItems(false);
  }, [bill]);

  const fetchPayments = useCallback(async () => {
    if (!bill) return;
    const { data } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("bill_id", bill.id)
      .order("created_at", { ascending: true });
    setPayments(
      (data || []).map((p: any) => ({
        id: p.id,
        payment_mode: p.payment_mode,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        transaction_id: p.transaction_id,
        notes: p.notes,
      }))
    );
  }, [bill]);

  useEffect(() => {
    fetchLineItems();
    fetchPayments();
  }, [fetchLineItems, fetchPayments]);

  const handleFinalize = async () => {
    if (!bill || !hospitalId) return;

    // GST compliance: check HSN codes
    const missingHSN = validateGSTLineItems(lineItems);
    if (missingHSN.length > 0) {
      toast({
        title: "HSN code missing",
        description: `HSN code missing for: ${missingHSN.join(", ")}. Add HSN codes in Settings → Service Rates before finalising.`,
        variant: "destructive",
      });
      return;
    }

    await supabase.from("bills").update({ bill_status: "final" }).eq("id", bill.id);

    // --- Accrual Revenue Recognition ---
    // Ensure posting rules exist for this hospital
    await (supabase as any).rpc("ensure_billing_posting_rules", { p_hospital_id: hospitalId });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const postedBy = user?.id || "system";

    // Determine trigger event based on bill type
    const billTypeMap: Record<string, string> = {
      opd: "bill_finalized_opd",
      ipd: "bill_finalized_ipd",
      lab: "bill_finalized_lab",
      radiology: "bill_finalized_radiology",
      pharmacy: "bill_finalized_pharmacy",
      ot: "bill_finalized_ot",
    };
    const triggerEvent = billTypeMap[bill.bill_type] || "bill_finalized_generic";

    // Post revenue journal entry: Dr. AR / Cr. Revenue
    const totalAmount = bill.total_amount || 0;
    if (totalAmount > 0) {
      await autoPostJournalEntry({
        triggerEvent,
        sourceModule: "billing",
        sourceId: bill.id,
        amount: totalAmount,
        description: `Revenue: Bill #${bill.bill_number} (${bill.bill_type.toUpperCase()}) — ${bill.patient_name}`,
        entryDate: bill.bill_date,
        hospitalId,
        postedBy,
      });

      // If insurance component exists, reclassify: Dr. Insurance Receivable / Cr. AR
      const insuranceAmount = bill.insurance_amount || 0;
      if (insuranceAmount > 0) {
        await autoPostJournalEntry({
          triggerEvent: "bill_insurance_reclassify",
          sourceModule: "billing",
          sourceId: bill.id,
          amount: insuranceAmount,
          description: `Insurance reclassification: Bill #${bill.bill_number} — ${bill.patient_name}`,
          entryDate: bill.bill_date,
          hospitalId,
          postedBy,
        });
      }
    }

    toast({ title: "Bill finalized" });

    // Trigger WhatsApp notification
    const { data: patient } = await supabase.from("patients").select("full_name, phone").eq("id", bill.patient_id).maybeSingle();
    if (patient?.phone && hospitalInfo) {
      const result = await sendBillGenerated({
        hospitalId,
        hospitalName: hospitalInfo.name || "Hospital",
        patientId: bill.patient_id,
        patientName: patient.full_name,
        phone: patient.phone,
        billNumber: bill.bill_number,
        billDate: bill.bill_date,
        totalAmount: bill.total_amount,
        insuranceAmount: bill.insurance_amount,
        patientPayable: bill.patient_payable,
      });
      showWaNotif(patient.full_name, "bill_generated", result.waUrl);
    }

    onRefresh();
  };

  const isIRNLocked = !!bill?.irn;

  const handleGenerateGST = async () => {
    if (!bill) return;
    const simulatedIRN = `DEMO-${Date.now()}-${bill.bill_number}`;
    await supabase.from("bills").update({
      irn: simulatedIRN,
      irn_generated_at: new Date().toISOString(),
      bill_status: "irn_locked",
    }).eq("id", bill.id);
    toast({ title: "Demo GST Invoice generated — bill is now locked", description: "Connect NIC IRP for live e-invoicing" });
    onRefresh();
    setShowGstInvoice(true);
  };

  const recalcBillTotals = async () => {
    if (!bill || !hospitalId) return;
    const { data: items } = await supabase
      .from("bill_line_items")
      .select("total_amount, gst_amount, taxable_amount")
      .eq("bill_id", bill.id);
    const subtotal = (items || []).reduce((s, i: any) => s + Number(i.taxable_amount || 0), 0);
    const gst = (items || []).reduce((s, i: any) => s + Number(i.gst_amount || 0), 0);
    const total = subtotal + gst;
    const patientPayable = total - bill.advance_received - bill.insurance_amount;
    const balanceDue = patientPayable - bill.paid_amount;
    await supabase.from("bills").update({
      subtotal, gst_amount: gst, total_amount: total,
      taxable_amount: subtotal, patient_payable: Math.max(0, patientPayable),
      balance_due: Math.max(0, balanceDue),
    }).eq("id", bill.id);
    onRefresh();
  };

  if (!bill) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/30">
        <Receipt size={48} className="text-muted-foreground/30 mb-3" />
        <p className="text-base text-muted-foreground">Select a bill or create a new one</p>
      </div>
    );
  }

  return (
    <>
    {waCard}
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {bill.patient_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-foreground">{bill.patient_name}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5">{bill.uhid}</Badge>
            <span className="text-[11px] font-mono text-muted-foreground">Bill #{bill.bill_number}</span>
          </div>
        </div>
        <div className="text-center">
          <Badge variant="outline" className="text-[10px] h-5 mb-1">{bill.bill_type.toUpperCase()}</Badge>
          <p className="text-[11px] text-muted-foreground">{bill.bill_date}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px]", statusBadgeStyle[bill.payment_status] || statusBadgeStyle.unpaid)}>
            {bill.payment_status.toUpperCase()}
          </Badge>
          {isIRNLocked && (
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700">
              <Lock size={10} /> IRN Locked
            </Badge>
          )}
          {bill.bill_status === "draft" && (
            <Button size="sm" className="h-7 text-[11px]" onClick={handleFinalize}>Finalise Bill</Button>
          )}
          {bill.bill_status === "final" && bill.gst_amount > 0 && !isIRNLocked && (
            <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={handleGenerateGST}>
              <FileText size={12} /> GST Invoice
            </Button>
          )}
          {bill.balance_due > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowPaymentLink(true)}>
              <Send size={12} /> Payment Link
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => window.print()}>
            <Printer size={12} /> Print
          </Button>
        </div>
      </div>

      {/* AI Revenue Intelligence */}
      <RevenueIntelligencePanel bill={bill} hospitalId={hospitalId} lineItems={lineItems} />

      {/* Tabs */}
      <Tabs defaultValue="items" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-card border-b border-border rounded-none h-11 px-5 flex-shrink-0">
          <TabsTrigger value="items" className="text-xs">Line Items</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs">Insurance</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="flex-1 overflow-hidden mt-0">
          <LineItemsTab
            bill={bill}
            hospitalId={hospitalId}
            lineItems={lineItems}
            loading={loadingItems}
            onRefresh={() => { fetchLineItems(); recalcBillTotals(); }}
          />
        </TabsContent>
        <TabsContent value="payments" className="flex-1 overflow-auto mt-0 p-5">
          <PaymentsTab
            bill={bill}
            hospitalId={hospitalId}
            payments={payments}
            onRefresh={() => { fetchPayments(); onRefresh(); }}
          />
        </TabsContent>
        <TabsContent value="insurance" className="flex-1 overflow-auto mt-0 p-5">
          <InsuranceTab bill={bill} hospitalId={hospitalId} onRefresh={onRefresh} />
        </TabsContent>
      </Tabs>

      {showGstInvoice && hospitalInfo && (
        <GSTInvoiceModal
          bill={bill}
          lineItems={lineItems}
          hospitalName={hospitalInfo.name || "Hospital"}
          hospitalGstin={hospitalInfo.gstin || ""}
          hospitalAddress={hospitalInfo.address || ""}
          irn={bill.notes || `DEMO-${bill.bill_number}`}
          onClose={() => setShowGstInvoice(false)}
        />
      )}
      {showPaymentLink && hospitalInfo && (
        <PaymentLinkModal
          bill={bill}
          hospitalName={hospitalInfo.name || "Hospital"}
          hospitalPhone=""
          razorpayConfigured={!!hospitalInfo.razorpay_key_id}
          onClose={() => setShowPaymentLink(false)}
        />
      )}
    </div>
    </>
  );
};

export default BillEditor;
