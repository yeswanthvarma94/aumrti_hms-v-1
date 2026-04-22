import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { HandCoins, MessageSquare, RefreshCw, AlertTriangle } from "lucide-react";
import { sendWhatsApp } from "@/lib/whatsapp-send";
import { formatINR } from "@/lib/currency";

interface PendingOPDBill {
  id: string;
  bill_number: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  patient_phone: string | null;
  doctor_name: string;
  bill_date: string;
  balance_due: number;
  total_amount: number;
  days_overdue: number;
}

interface Props {
  hospitalId: string;
  hospitalName: string;
  onCollectNow: (billId: string) => void;
}

const rowTone = (days: number) => {
  if (days >= 8) return "bg-destructive/10 hover:bg-destructive/15";
  if (days >= 4) return "bg-orange-500/10 hover:bg-orange-500/15";
  return "bg-yellow-500/10 hover:bg-yellow-500/15";
};

const badgeTone = (days: number) => {
  if (days >= 8) return "bg-destructive/15 text-destructive border-destructive/30";
  if (days >= 4) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
  return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30";
};

const PendingOPDTab: React.FC<Props> = ({ hospitalId, hospitalName, onCollectNow }) => {
  const { toast } = useToast();
  const [bills, setBills] = useState<PendingOPDBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    setLoading(true);

    // 1. Fetch pending OPD bills with patient info
    const { data: billsData, error: billsErr } = await supabase
      .from("bills")
      .select("id, bill_number, patient_id, bill_date, total_amount, balance_due, patients!inner(full_name, uhid, phone)")
      .eq("hospital_id", hospitalId)
      .eq("bill_type", "opd")
      .eq("payment_status", "pending")
      .order("bill_date", { ascending: true })
      .limit(500);

    if (billsErr) {
      console.error("Failed to load pending OPD bills:", billsErr.message);
      toast({ title: "Failed to load pending OPD bills", variant: "destructive" });
      setBills([]);
      setLoading(false);
      return;
    }

    if (!billsData || billsData.length === 0) {
      setBills([]);
      setLoading(false);
      return;
    }

    // 2. Resolve doctor name via opd_tokens (patient_id + visit_date = bill_date)
    const patientIds = Array.from(new Set(billsData.map((b: any) => b.patient_id)));
    const billDates = Array.from(new Set(billsData.map((b: any) => b.bill_date)));

    const { data: tokensData, error: tokensErr } = await supabase
      .from("opd_tokens")
      .select("patient_id, visit_date, doctor_id")
      .eq("hospital_id", hospitalId)
      .in("patient_id", patientIds)
      .in("visit_date", billDates);

    if (tokensErr) {
      console.error("Failed to load OPD tokens:", tokensErr.message);
    }

    const doctorIds = Array.from(
      new Set((tokensData || []).map((t: any) => t.doctor_id).filter(Boolean))
    ) as string[];

    let doctorMap: Record<string, string> = {};
    if (doctorIds.length > 0) {
      const { data: docs } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", doctorIds);
      (docs || []).forEach((d: any) => {
        doctorMap[d.id] = d.full_name;
      });
    }

    const tokenMap: Record<string, string> = {};
    (tokensData || []).forEach((t: any) => {
      const key = `${t.patient_id}|${t.visit_date}`;
      if (t.doctor_id && doctorMap[t.doctor_id]) {
        tokenMap[key] = doctorMap[t.doctor_id];
      }
    });

    const today = new Date();
    const mapped: PendingOPDBill[] = billsData.map((b: any) => {
      const key = `${b.patient_id}|${b.bill_date}`;
      const docName = tokenMap[key] || "—";
      return {
        id: b.id,
        bill_number: b.bill_number,
        patient_id: b.patient_id,
        patient_name: b.patients?.full_name || "Unknown",
        uhid: b.patients?.uhid || "",
        patient_phone: b.patients?.phone || null,
        doctor_name: docName ? (docName.startsWith("Dr") ? docName : `Dr. ${docName}`) : "—",
        bill_date: b.bill_date,
        balance_due: Number(b.balance_due) || 0,
        total_amount: Number(b.total_amount) || 0,
        days_overdue: Math.max(0, differenceInDays(today, new Date(b.bill_date))),
      };
    });

    setBills(mapped);
    setLoading(false);
  }, [hospitalId, toast]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Summary stats
  const summary = useMemo(() => {
    const totalCount = bills.length;
    const totalAmount = bills.reduce((s, b) => s + b.balance_due, 0);
    const oldestDays = bills.reduce((m, b) => Math.max(m, b.days_overdue), 0);
    return { totalCount, totalAmount, oldestDays };
  }, [bills]);

  const handleSendReminder = async (bill: PendingOPDBill) => {
    if (!bill.patient_phone) {
      toast({ title: "Patient phone not on file", variant: "destructive" });
      return;
    }
    setSendingId(bill.id);

    // Reuse / create a payment link for /pay/:token route
    let token: string | null = null;
    const { data: existingLink, error: linkLookupErr } = await supabase
      .from("payment_links" as any)
      .select("link_token, status, expires_at")
      .eq("hospital_id", hospitalId)
      .eq("bill_id", bill.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkLookupErr) {
      console.error("Failed to look up payment link:", linkLookupErr.message);
    }

    const stillValid =
      existingLink &&
      (existingLink as any).link_token &&
      new Date((existingLink as any).expires_at) > new Date();

    if (stillValid) {
      token = (existingLink as any).link_token;
    } else {
      const newToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("hospital_id", hospitalId)
        .limit(1)
        .maybeSingle();

      const { error: insertErr } = await supabase.from("payment_links" as any).insert({
        hospital_id: hospitalId,
        bill_id: bill.id,
        patient_id: bill.patient_id,
        link_token: newToken,
        amount: bill.balance_due,
        expires_at: expiresAt,
        created_by: userRow?.id || null,
        sent_via: ["whatsapp"],
      });

      if (insertErr) {
        console.error("Failed to create payment link:", insertErr.message);
        toast({ title: "Failed to generate payment link", variant: "destructive" });
        setSendingId(null);
        return;
      }
      token = newToken;
    }

    const paymentLink = `${window.location.origin}/pay/${token}`;
    const message =
      `Dear ${bill.patient_name}, your consultation bill of ${formatINR(bill.balance_due)} ` +
      `at ${hospitalName} (Bill No: ${bill.bill_number}) is pending. ` +
      `Please visit the billing counter or pay online: ${paymentLink}`;

    try {
      const result = await sendWhatsApp({
        hospitalId,
        phone: bill.patient_phone,
        message,
      });
      // Mark bill as having had a payment link sent
      await supabase
        .from("bills")
        .update({ payment_link_sent: true })
        .eq("id", bill.id);

      toast({
        title: result.method === "wati" ? "Reminder sent via WATI ✓" : "WhatsApp opened ✓",
      });
    } catch (err: any) {
      console.error("WhatsApp send failed:", err?.message || err);
      toast({ title: "Failed to send reminder", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary Card */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
              Total Pending
            </p>
            <p className="text-2xl font-bold font-mono mt-1">{summary.totalCount}</p>
            <p className="text-[10px] text-muted-foreground">OPD bills awaiting payment</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
              Total Pending Amount
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-primary">
              {formatINR(summary.totalAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground">Sum of balance due</p>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              summary.oldestDays >= 8
                ? "border-destructive/30 bg-destructive/5"
                : summary.oldestDays >= 4
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-border bg-card",
            )}
          >
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
              Oldest Pending
            </p>
            <p className="text-2xl font-bold font-mono mt-1 flex items-center gap-2">
              {summary.oldestDays}
              <span className="text-sm text-muted-foreground font-normal">days</span>
              {summary.oldestDays >= 8 && (
                <AlertTriangle size={16} className="text-destructive" />
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">Most overdue bill</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-bold">Pending OPD Bills ({bills.length})</h3>
        <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={loadBills}>
          <RefreshCw size={12} /> Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Loading pending OPD bills…
          </p>
        ) : bills.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No pending OPD bills 🎉
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-[10px] font-bold uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Bill No</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">UHID</th>
                  <th className="px-3 py-2 text-left">Doctor</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Amount Due</th>
                  <th className="px-3 py-2 text-center">Days Overdue</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr
                    key={b.id}
                    className={cn("border-t border-border transition-colors", rowTone(b.days_overdue))}
                  >
                    <td className="px-3 py-2 text-[11px] font-mono">{b.bill_number}</td>
                    <td className="px-3 py-2 text-xs font-medium truncate max-w-[160px]">
                      {b.patient_name}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">
                      {b.uhid}
                    </td>
                    <td className="px-3 py-2 text-xs truncate max-w-[140px]">{b.doctor_name}</td>
                    <td className="px-3 py-2 text-xs">
                      {format(new Date(b.bill_date), "dd/MM/yyyy")}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono font-bold">
                      {formatINR(b.balance_due)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-mono", badgeTone(b.days_overdue))}>
                        {b.days_overdue}d
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => onCollectNow(b.id)}
                        >
                          <HandCoins size={12} /> Collect Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          disabled={sendingId === b.id || !b.patient_phone}
                          onClick={() => handleSendReminder(b)}
                          title={b.patient_phone ? "Send WhatsApp reminder" : "No phone on file"}
                        >
                          <MessageSquare size={12} />
                          {sendingId === b.id ? "Sending…" : "Send Reminder"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingOPDTab;
