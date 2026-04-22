import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package as PackageIcon,
  Receipt,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { logAudit } from "@/lib/auditLog";
import {
  checkPackageExcess,
  type PackageExcessResult,
} from "@/lib/packageBilling";

interface Props {
  admissionId: string;
  hospitalId: string;
  /** Optional package id hint when caller already knows it. */
  packageId?: string | null;
  /** Auto-show the modal when excess > 0 (used at discharge gate). */
  autoOpen?: boolean;
  /** Called after the gate is satisfied (no excess, paid, or waived). */
  onResolved?: () => void;
  /** Compact inline trigger — used from billing toolbar. */
  variant?: "inline" | "card";
}

const WAIVE_ROLES = new Set(["admin", "hospital_admin", "super_admin", "billing_manager"]);

const formatINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

const PackageExcessCheck: React.FC<Props> = ({
  admissionId,
  hospitalId,
  packageId,
  autoOpen = false,
  onResolved,
  variant = "card",
}) => {
  const { role, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PackageExcessResult | null>(null);
  const [open, setOpen] = useState(false);
  const [raising, setRaising] = useState(false);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [waiving, setWaiving] = useState(false);

  const canWaive = !!role && WAIVE_ROLES.has(role);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await checkPackageExcess(
        admissionId,
        packageId || hospitalId,
        packageId ? hospitalId : undefined,
      );
      setResult(res);

      // Auto-resolve callback when nothing to fix.
      const blocked =
        res.linked &&
        ((res.excessAmount > 0 &&
          (!res.existingExcessBill ||
            (res.existingExcessBill.payment_status !== "paid" &&
              !res.existingExcessBill.waived))) ||
          (res.existingExcessBill &&
            res.existingExcessBill.payment_status !== "paid" &&
            !res.existingExcessBill.waived));

      if (!blocked) onResolved?.();

      if (autoOpen && blocked) setOpen(true);
    } catch (err) {
      console.error("Package excess check failed:", err);
      toast({
        title: "Could not check package excess",
        description: (err as Error)?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [admissionId, hospitalId, packageId, autoOpen, onResolved]);

  useEffect(() => {
    run();
  }, [run]);

  const raiseExcessBill = async () => {
    if (!result || !result.linked || result.excessAmount <= 0) return;
    setRaising(true);
    try {
      // Resolve patient_id for the bill insert.
      const { data: adm } = await (supabase as any)
        .from("admissions")
        .select("patient_id")
        .eq("id", admissionId)
        .maybeSingle();
      if (!adm?.patient_id) throw new Error("Could not resolve patient for admission.");

      const billNumber = await generateBillNumber(hospitalId, "EXCESS");
      const total = Math.round(result.excessAmount);
      const today = new Date().toISOString().split("T")[0];

      const { data: bill, error: billErr } = await (supabase as any)
        .from("bills")
        .insert({
          hospital_id: hospitalId,
          patient_id: adm.patient_id,
          admission_id: admissionId,
          bill_type: "package_excess",
          bill_number: billNumber,
          bill_date: today,
          bill_status: "draft",
          payment_status: "unpaid",
          total_amount: total,
          net_amount: total,
          notes: `Package excess for ${result.packageName || "linked package"}`,
        })
        .select("id, bill_number")
        .maybeSingle();

      if (billErr || !bill) throw new Error(billErr?.message || "Failed to create excess bill");

      // Insert line items.
      const lineRows = result.excessItems.map((it) => ({
        hospital_id: hospitalId,
        bill_id: bill.id,
        item_type: "other",
        description: it.description,
        quantity: 1,
        unit_rate: Math.round(it.amount),
        taxable_amount: Math.round(it.amount),
        gst_percent: 0,
        gst_amount: 0,
        total_amount: Math.round(it.amount),
        source_module: "package_excess",
      }));
      if (lineRows.length > 0) {
        const { error: liErr } = await (supabase as any)
          .from("bill_line_items")
          .insert(lineRows);
        if (liErr) {
          console.error("Excess line items insert failed:", liErr.message);
        }
      }

      // Audit + journal posting (best effort).
      try {
        await logAudit({
          action: "package_excess_bill_raised",
          module: "packages",
          entityType: "bill",
          entityId: bill.id,
          details: {
            admission_id: admissionId,
            package_id: result.packageId,
            amount: total,
            items: result.excessItems,
          },
        });
      } catch (e) {
        console.error("Audit log failed:", e);
      }

      try {
        const { autoPostJournalEntry } = await import("@/lib/accounting");
        await autoPostJournalEntry({
          triggerEvent: "bill_finalized_package_excess",
          sourceModule: "packages",
          sourceId: bill.id,
          amount: total,
          description: `Package Excess Revenue - Bill ${bill.bill_number || billNumber}`,
          hospitalId,
          postedBy: userId || "",
        });
      } catch (e) {
        console.error("Journal posting failed:", e);
      }

      toast({
        title: "Excess bill raised",
        description: `${bill.bill_number || billNumber} — ${formatINR(total)}`,
      });
      setOpen(false);
      await run();
    } catch (err) {
      console.error("Raise excess bill failed:", err);
      toast({
        title: "Failed to raise excess bill",
        description: (err as Error)?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRaising(false);
    }
  };

  const submitWaive = async () => {
    if (!result) return;
    if (waiveReason.trim().length < 10) {
      toast({
        title: "Reason required",
        description: "Please enter at least 10 characters explaining the waiver.",
        variant: "destructive",
      });
      return;
    }
    setWaiving(true);
    try {
      // If an excess bill already exists, mark it waived in notes; else
      // create a 0-amount waiver record so the audit chain is preserved.
      let billId = result.existingExcessBill?.id || null;
      if (billId) {
        const { error: upErr } = await (supabase as any)
          .from("bills")
          .update({
            payment_status: "waived",
            notes: `[WAIVED] ${waiveReason.trim()}`,
            bill_status: "waived",
          })
          .eq("id", billId);
        if (upErr) throw new Error(upErr.message);
      }

      await logAudit({
        action: "package_excess_waived",
        module: "packages",
        entityType: billId ? "bill" : "admission",
        entityId: billId || admissionId,
        details: {
          admission_id: admissionId,
          package_id: result.packageId,
          items: result.excessItems,
          amount: result.excessAmount,
          reason: waiveReason.trim(),
        },
      });

      toast({ title: "Excess waived", description: "Recorded in audit log." });
      setWaiveOpen(false);
      setWaiveReason("");
      setOpen(false);
      await run();
    } catch (err) {
      console.error("Waive failed:", err);
      toast({
        title: "Waive failed",
        description: (err as Error)?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWaiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-md px-2 py-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking package coverage…
      </div>
    );
  }

  if (!result || !result.linked) return null;

  const existing = result.existingExcessBill;
  const settled =
    !!existing && (existing.payment_status === "paid" || existing.waived);
  const hasOpenExcess = result.excessAmount > 0 && !existing;
  const showAlert = hasOpenExcess || (!!existing && !settled);

  // Resolved state — small green chip
  if (!showAlert) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5">
        <CheckCircle2 className="h-3 w-3" />
        <span className="font-semibold">
          Package coverage OK
          {existing?.waived ? " (excess waived)" : existing ? " (excess paid)" : ""}
        </span>
      </div>
    );
  }

  const triggerNode =
    variant === "inline" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold underline"
      >
        <PackageIcon className="h-3 w-3" /> Package excess: {formatINR(result.excessAmount || existing?.total_amount || 0)}
      </button>
    ) : (
      <div className="bg-amber-50 border border-amber-300 rounded-md p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[11px] font-semibold text-amber-800">
            Package excess detected — resolve before discharge summary
          </span>
          <button
            onClick={run}
            className="ml-auto text-[10px] text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
            type="button"
          >
            <RefreshCw className="h-3 w-3" /> Re-check
          </button>
        </div>
        <p className="text-[10.5px] text-amber-900">
          Package: <strong>{result.packageName || "Linked package"}</strong> ·
          {existing
            ? ` Bill ${existing.bill_number || ""} ${formatINR(existing.total_amount || 0)} ${existing.payment_status}`
            : ` ${result.excessItems.length} excess item(s) · ${formatINR(result.excessAmount)}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-100 w-full"
          onClick={() => setOpen(true)}
        >
          Review Package Excess →
        </Button>
      </div>
    );

  return (
    <>
      {triggerNode}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageIcon className="h-4 w-4 text-amber-600" />
              Package Excess Charges Detected
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Package: <strong className="text-foreground">{result.packageName || "Linked package"}</strong>
            </div>

            {existing ? (
              <div className="bg-muted/50 border border-border rounded p-2 text-xs">
                Existing excess bill <strong>{existing.bill_number}</strong> —{" "}
                {formatINR(existing.total_amount || 0)} ·{" "}
                <span className="capitalize">{existing.payment_status}</span>
                {existing.waived && " · waived"}
              </div>
            ) : (
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-semibold">Item</th>
                      <th className="text-left p-2 font-semibold w-32">Type</th>
                      <th className="text-right p-2 font-semibold w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.excessItems.map((it, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="p-2">{it.description}</td>
                        <td className="p-2 text-muted-foreground capitalize">
                          {it.kind.replace(/_/g, " ")}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatINR(it.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={2} className="p-2 text-right font-semibold">
                        Total Excess
                      </td>
                      <td className="p-2 text-right font-bold font-mono">
                        {formatINR(result.excessAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
            {canWaive && !settled && (
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => setWaiveOpen(true)}
              >
                <ShieldAlert className="h-3 w-3 mr-1" /> Waive
              </Button>
            )}
            {!existing && result.excessAmount > 0 && (
              <Button size="sm" onClick={raiseExcessBill} disabled={raising}>
                {raising ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Raising…
                  </>
                ) : (
                  <>
                    <Receipt className="h-3 w-3 mr-1" /> Raise Excess Bill
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waiveOpen} onOpenChange={setWaiveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Waive Package Excess
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This waives {formatINR(result.excessAmount || existing?.total_amount || 0)}{" "}
            of excess charges. The action will be recorded in the audit log.
          </p>
          <Textarea
            placeholder="Reason for waiver (min 10 characters) *"
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground -mt-2">
            {waiveReason.trim().length}/10 characters
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setWaiveOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={submitWaive}
              disabled={waiving || waiveReason.trim().length < 10}
            >
              {waiving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" /> Recording…
                </>
              ) : (
                "Confirm Waiver"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PackageExcessCheck;
