import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Receipt, ShieldOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  checkPackageExcess,
  type PackageExcessResult,
  type PackageExcessItem,
} from "@/lib/packageBilling";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { autoPostJournalEntry } from "@/lib/accounting";
import { logAudit } from "@/lib/auditLog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  admissionId: string;
  packageId: string;
  hospitalId: string;
  patientId: string;
  /** Called after a Raise/Waive succeeds. */
  onResolved?: () => void;
}

const WAIVE_ROLES = new Set([
  "admin",
  "hospital_admin",
  "super_admin",
  "billing_manager",
]);

const formatINR = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const reasonLabel = (r: PackageExcessItem["reason"]) => {
  switch (r) {
    case "extra_los":
      return "Extra LOS";
    case "room_upgrade":
      return "Room Upgrade";
    default:
      return "Outside Package";
  }
};

const PackageExcessModal: React.FC<Props> = ({
  open,
  onClose,
  admissionId,
  packageId,
  hospitalId,
  patientId,
  onResolved,
}) => {
  const navigate = useNavigate();
  const { role, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PackageExcessResult | null>(null);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canWaive = !!role && WAIVE_ROLES.has(role);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await checkPackageExcess(admissionId, packageId, hospitalId);
        if (!cancelled) setResult(r);
      } catch (err: any) {
        console.error("Package excess check failed:", err);
        toast({
          title: "Excess check failed",
          description: err?.message ?? "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, admissionId, packageId, hospitalId]);

  const handleRaiseExcessBill = async () => {
    if (!result || result.excessItems.length === 0) return;
    setSubmitting(true);
    try {
      const billNumber = await generateBillNumber(hospitalId, "EXCESS");
      const subtotal = result.excessAmount;

      const { data: bill, error: billErr } = await (supabase as any)
        .from("bills")
        .insert({
          hospital_id: hospitalId,
          patient_id: patientId,
          admission_id: admissionId,
          bill_number: billNumber,
          bill_type: "package_excess",
          bill_status: "draft",
          payment_status: "unpaid",
          bill_date: new Date().toISOString().split("T")[0],
          total_amount: subtotal,
          net_amount: subtotal,
        })
        .select()
        .single();
      if (billErr) {
        console.error("Excess bill insert failed:", billErr.message);
        toast({
          title: "Could not raise excess bill",
          description: billErr.message,
          variant: "destructive",
        });
        return;
      }

      const lineRows = result.excessItems.map((it) => ({
        hospital_id: hospitalId,
        bill_id: bill.id,
        description: `[${reasonLabel(it.reason)}] ${it.description}`,
        item_type: "package_excess",
        quantity: it.quantity,
        unit_rate: it.unitRate,
        total_amount: it.amount,
        taxable_amount: it.amount,
        source_module: "package",
        source_dedupe_key: it.sourceLineItemId
          ? `pkg-excess:${it.sourceLineItemId}`
          : `pkg-excess:${it.reason}:${admissionId}`,
      }));
      const { error: liErr } = await (supabase as any)
        .from("bill_line_items")
        .insert(lineRows);
      if (liErr) {
        console.error("Excess line items insert failed:", liErr.message);
        toast({
          title: "Excess bill created without items",
          description: liErr.message,
          variant: "destructive",
        });
      }

      try {
        await autoPostJournalEntry({
          triggerEvent: "bill_finalized_package_excess",
          sourceModule: "package",
          sourceId: bill.id,
          amount: subtotal,
          description: `Package Excess - Bill ${billNumber}`,
          hospitalId,
          postedBy: userId || "",
        });
      } catch (err) {
        console.warn("Journal posting skipped:", err);
      }

      await logAudit({
        action: "package_excess_bill_raised",
        module: "packages",
        entityType: "admission",
        entityId: admissionId,
        details: {
          billId: bill.id,
          billNumber,
          packageId,
          amount: subtotal,
          itemCount: result.excessItems.length,
        },
      });

      toast({
        title: "Excess bill raised",
        description: `${billNumber} · ${formatINR(subtotal)}`,
      });
      onResolved?.();
      onClose();
      navigate(
        `/billing?action=new&admission_id=${admissionId}&type=package_excess`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaive = async () => {
    if (waiveReason.trim().length < 10) {
      toast({
        title: "Reason required",
        description: "Please enter at least 10 characters explaining the waiver.",
        variant: "destructive",
      });
      return;
    }
    if (!result) return;
    setSubmitting(true);
    try {
      await logAudit({
        action: "package_excess_waived",
        module: "packages",
        entityType: "admission",
        entityId: admissionId,
        details: {
          packageId,
          items: result.excessItems,
          amount: result.excessAmount,
          reason: waiveReason.trim(),
        },
      });
      toast({
        title: "Excess waived",
        description: `${formatINR(result.excessAmount)} waived and logged.`,
      });
      setWaiveOpen(false);
      setWaiveReason("");
      onResolved?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Package Excess Charges Detected
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !result || !result.ok ? (
          <div className="py-6 text-sm text-destructive">
            {result?.error ?? "Unable to evaluate package excess."}
          </div>
        ) : result.excessItems.length === 0 ? (
          <div className="py-6 text-sm text-emerald-700">
            ✅ No excess charges. All consumed services are within the package
            scope.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Package:{" "}
              <span className="font-semibold text-foreground">
                {result.packageName}
              </span>{" "}
              · LOS cover: {result.packageLosDays ?? "—"} days · Inclusions:{" "}
              {result.inclusionsCount}
            </div>

            {result.excessBillExists && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                An excess bill already exists for this admission
                {result.excessBillUnpaidId
                  ? " and is currently unpaid."
                  : " (paid)."}
              </div>
            )}
            {result.waived && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-800">
                A formal waiver has been recorded for this admission's package
                excess.
              </div>
            )}

            <div className="max-h-[320px] overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Reason</th>
                    <th className="px-2 py-1.5 text-left">Description</th>
                    <th className="px-2 py-1.5 text-right">Qty</th>
                    <th className="px-2 py-1.5 text-right">Rate</th>
                    <th className="px-2 py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.excessItems.map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {reasonLabel(it.reason)}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">{it.description}</td>
                      <td className="px-2 py-1.5 text-right">{it.quantity}</td>
                      <td className="px-2 py-1.5 text-right">
                        {formatINR(it.unitRate)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">
                        {formatINR(it.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td colSpan={4} className="px-2 py-1.5 text-right font-bold">
                      Total Excess
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-destructive">
                      {formatINR(result.excessAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {!loading && result?.excessItems.length ? (
          <DialogFooter className="gap-2">
            {canWaive && (
              <Button
                variant="outline"
                onClick={() => setWaiveOpen(true)}
                disabled={submitting}
              >
                <ShieldOff className="h-4 w-4 mr-1" /> Waive
              </Button>
            )}
            <Button
              onClick={handleRaiseExcessBill}
              disabled={submitting || result.excessBillExists}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Receipt className="h-4 w-4 mr-1" />
              )}
              Raise Excess Bill
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}

        {/* Waive dialog */}
        <Dialog open={waiveOpen} onOpenChange={setWaiveOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Waive Package Excess</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Provide a reason (min 10 characters). This will be logged in the
                audit trail.
              </p>
              <Textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                rows={4}
                placeholder="e.g. Goodwill waiver approved by GM Operations on call..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWaiveOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleWaive}
                disabled={submitting || waiveReason.trim().length < 10}
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                Confirm Waiver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default PackageExcessModal;
