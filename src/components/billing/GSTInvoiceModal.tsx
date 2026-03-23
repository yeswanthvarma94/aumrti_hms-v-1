import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, MessageSquare, Mail } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { BillRecord } from "@/pages/billing/BillingPage";
import type { LineItem } from "@/components/billing/BillEditor";

interface Props {
  bill: BillRecord;
  lineItems: LineItem[];
  hospitalName: string;
  hospitalGstin: string;
  hospitalAddress: string;
  irn: string;
  onClose: () => void;
}

const GSTInvoiceModal: React.FC<Props> = ({
  bill, lineItems, hospitalName, hospitalGstin, hospitalAddress, irn, onClose,
}) => {
  const taxableItems = lineItems.filter((i) => i.gst_percent > 0);

  // Group GST
  const gstBreakdown: Record<number, { taxable: number; cgst: number; sgst: number }> = {};
  taxableItems.forEach((i) => {
    const taxable = i.quantity * i.unit_rate * (1 - i.discount_percent / 100);
    const gst = taxable * i.gst_percent / 100;
    if (!gstBreakdown[i.gst_percent]) gstBreakdown[i.gst_percent] = { taxable: 0, cgst: 0, sgst: 0 };
    gstBreakdown[i.gst_percent].taxable += taxable;
    gstBreakdown[i.gst_percent].cgst += gst / 2;
    gstBreakdown[i.gst_percent].sgst += gst / 2;
  });

  const totalTaxable = Object.values(gstBreakdown).reduce((s, g) => s + g.taxable, 0);
  const totalCgst = Object.values(gstBreakdown).reduce((s, g) => s + g.cgst, 0);
  const totalSgst = Object.values(gstBreakdown).reduce((s, g) => s + g.sgst, 0);

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>GST Tax Invoice</DialogTitle>
        </DialogHeader>

        {/* Invoice preview */}
        <div className="border border-border rounded-lg overflow-hidden text-xs" id="gst-invoice-print">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-5 py-3 text-center">
            <p className="text-base font-bold tracking-wide">TAX INVOICE</p>
          </div>

          {/* Seller / Buyer */}
          <div className="grid grid-cols-2 border-b border-border">
            <div className="p-3 border-r border-border">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Seller</p>
              <p className="font-bold text-foreground">{hospitalName}</p>
              <p className="text-muted-foreground">{hospitalAddress || "—"}</p>
              <p className="text-muted-foreground mt-1">GSTIN: {hospitalGstin || "Not configured"}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Buyer</p>
              <p className="font-bold text-foreground">{bill.patient_name}</p>
              <p className="text-muted-foreground">UHID: {bill.uhid}</p>
            </div>
          </div>

          {/* IRN */}
          <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">IRN</p>
              <p className="font-mono text-xs font-bold text-foreground break-all">{irn}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Invoice No: {bill.bill_number}</p>
              <p className="text-[10px] text-muted-foreground">Date: {bill.bill_date}</p>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-[9px] font-bold uppercase text-muted-foreground">
                <th className="px-2 py-1.5 text-left">#</th>
                <th className="px-2 py-1.5 text-left">Description</th>
                <th className="px-2 py-1.5 text-center">HSN</th>
                <th className="px-2 py-1.5 text-center">Qty</th>
                <th className="px-2 py-1.5 text-right">Rate</th>
                <th className="px-2 py-1.5 text-right">Taxable</th>
                <th className="px-2 py-1.5 text-center">CGST%</th>
                <th className="px-2 py-1.5 text-right">CGST</th>
                <th className="px-2 py-1.5 text-center">SGST%</th>
                <th className="px-2 py-1.5 text-right">SGST</th>
                <th className="px-2 py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {taxableItems.map((item, idx) => {
                const taxable = item.quantity * item.unit_rate * (1 - item.discount_percent / 100);
                const gst = taxable * item.gst_percent / 100;
                return (
                  <tr key={item.id} className="border-b border-border">
                    <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-1 text-foreground">{item.description}</td>
                    <td className="px-2 py-1 text-center text-muted-foreground">{item.hsn_code || "999311"}</td>
                    <td className="px-2 py-1 text-center">{item.quantity}</td>
                    <td className="px-2 py-1 text-right">{fmt(item.unit_rate)}</td>
                    <td className="px-2 py-1 text-right">{fmt(taxable)}</td>
                    <td className="px-2 py-1 text-center">{item.gst_percent / 2}%</td>
                    <td className="px-2 py-1 text-right">{fmt(gst / 2)}</td>
                    <td className="px-2 py-1 text-center">{item.gst_percent / 2}%</td>
                    <td className="px-2 py-1 text-right">{fmt(gst / 2)}</td>
                    <td className="px-2 py-1 text-right font-bold">{fmt(taxable + gst)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-bold border-t border-border">
                <td colSpan={5} className="px-2 py-1.5 text-right">Total</td>
                <td className="px-2 py-1.5 text-right">{fmt(totalTaxable)}</td>
                <td />
                <td className="px-2 py-1.5 text-right">{fmt(totalCgst)}</td>
                <td />
                <td className="px-2 py-1.5 text-right">{fmt(totalSgst)}</td>
                <td className="px-2 py-1.5 text-right">{fmt(totalTaxable + totalCgst + totalSgst)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Declaration */}
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground italic">
              We declare that this invoice shows actual price of goods/services described
              and that all particulars are true and correct.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">Computer generated invoice — no signature required</p>
          </div>

          {/* UPI QR Code */}
          {bill.balance_due > 0 && (
            <div className="px-4 py-3 border-t border-border flex items-center gap-4">
              <QRCodeSVG
                value={`upi://pay?pa=hospital@upi&pn=${encodeURIComponent(hospitalName)}&am=${bill.balance_due}&cu=INR&tn=Bill-${bill.bill_number}`}
                size={80}
                level="M"
              />
              <div>
                <p className="text-xs font-bold text-foreground">Pay via UPI</p>
                <p className="text-[11px] text-muted-foreground">Scan & pay ₹{bill.balance_due.toLocaleString("en-IN")}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">UPI ID: hospital@upi</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => window.print()}>
            <Printer size={14} /> Print Invoice
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <MessageSquare size={14} /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <Mail size={14} /> Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GSTInvoiceModal;
