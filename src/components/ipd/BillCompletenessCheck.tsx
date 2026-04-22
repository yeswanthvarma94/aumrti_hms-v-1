import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  checkIPDBillCompleteness,
  type BillCompletenessResult,
  type BillCompletenessIssue,
} from "@/lib/ipdBilling";
import { logAudit } from "@/lib/auditLog";
import { useAuth } from "@/context/AuthContext";

interface Props {
  admissionId: string;
  hospitalId: string;
  /** Called when the check passes OR an authorised user overrides. */
  onCleared: (overridden: boolean) => void;
}

const OVERRIDE_ROLES = new Set(["admin", "hospital_admin", "super_admin", "billing_manager"]);

const BillCompletenessCheck: React.FC<Props> = ({
  admissionId,
  hospitalId,
  onCleared,
}) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BillCompletenessResult | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const canOverride = !!role && OVERRIDE_ROLES.has(role);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await checkIPDBillCompleteness(admissionId, hospitalId);
      setResult(res);
      if (res.complete) onCleared(false);
    } catch (err) {
      console.error("Bill completeness check failed:", err);
      toast({
        title: "Could not run bill completeness check",
        description: (err as Error)?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [admissionId, hospitalId, onCleared]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const handleFix = (issue: BillCompletenessIssue) => {
    switch (issue.fixTarget) {
      case "billing":
        navigate(`/billing?action=new&admission_id=${admissionId}&type=ipd`);
        break;
      case "lab":
        navigate(`/lab?admission_id=${admissionId}`);
        break;
      case "pharmacy":
        navigate(`/pharmacy?admission_id=${admissionId}`);
        break;
      case "nursing":
        navigate(`/nursing?admission_id=${admissionId}`);
        break;
      default:
        break;
    }
  };

  const submitOverride = async () => {
    if (overrideReason.trim().length < 10) {
      toast({
        title: "Reason required",
        description: "Please enter at least 10 characters explaining the override.",
        variant: "destructive",
      });
      return;
    }
    setOverriding(true);
    try {
      await logAudit({
        action: "ipd_bill_completeness_override",
        module: "ipd_discharge",
        entityType: "admission",
        entityId: admissionId,
        details: {
          reason: overrideReason.trim(),
          bypassed_issues: result?.issues || [],
          bill_id: result?.billId || null,
        },
      });
      toast({ title: "Override recorded — proceeding to billing step." });
      setOverrideOpen(false);
      setOverrideReason("");
      onCleared(true);
    } catch (err) {
      console.error("Override audit failed:", err);
      toast({
        title: "Override failed",
        description: (err as Error)?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setOverriding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-md px-2 py-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running bill completeness check…
      </div>
    );
  }

  if (!result) return null;

  if (result.complete) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5">
        <CheckCircle2 className="h-3 w-3" />
        <span className="font-semibold">Bill Complete ✓</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-300 rounded-md p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[11px] font-semibold text-amber-800">
            Bill incomplete — resolve before billing
          </span>
          <button
            onClick={runCheck}
            className="ml-auto text-[10px] text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
            type="button"
          >
            <RefreshCw className="h-3 w-3" /> Re-check
          </button>
        </div>

        <ul className="space-y-1">
          {result.issues.map((iss) => (
            <li
              key={iss.code}
              className="flex items-center justify-between gap-2 bg-white/60 border border-amber-200 rounded px-1.5 py-1"
            >
              <span className="text-[10.5px] text-amber-900 leading-tight">
                {iss.message}
              </span>
              {iss.fixTarget && (
                <button
                  type="button"
                  onClick={() => handleFix(iss)}
                  className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
                >
                  Fix Now →
                </button>
              )}
            </li>
          ))}
        </ul>

        {canOverride && (
          <div className="pt-1 border-t border-amber-200">
            <button
              type="button"
              onClick={() => setOverrideOpen(true)}
              className="text-[10px] text-destructive hover:opacity-80 inline-flex items-center gap-1 font-medium"
            >
              <ShieldAlert className="h-3 w-3" /> Override — Proceed Anyway
            </button>
          </div>
        )}
      </div>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Override Bill Completeness
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This bypasses {result.issues.length} pending check
            {result.issues.length === 1 ? "" : "s"}. The action will be recorded
            in the audit log.
          </p>
          <Textarea
            placeholder="Reason for override (min 10 characters) *"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground -mt-2">
            {overrideReason.trim().length}/10 characters
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={submitOverride}
              disabled={overriding || overrideReason.trim().length < 10}
            >
              {overriding ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" /> Recording…
                </>
              ) : (
                "Confirm Override"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BillCompletenessCheck;
