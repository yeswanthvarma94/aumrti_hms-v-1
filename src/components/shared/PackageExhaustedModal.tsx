import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, IndianRupee } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageName: string;
  sessionsIncluded: number;
  sessionsUsed: number;
  ratePerSession: number;
  serviceLabel?: string;
  onBillAsExtra: () => void;
  onCancel: () => void;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const PackageExhaustedModal: React.FC<Props> = ({
  open,
  onOpenChange,
  packageName,
  sessionsIncluded,
  sessionsUsed,
  ratePerSession,
  serviceLabel = "session",
  onBillAsExtra,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={18} /> Package sessions exhausted
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2 text-foreground">
            <span className="block">
              Patient&apos;s active package <strong>{packageName}</strong> has been fully used:{" "}
              <strong>
                {sessionsUsed}/{sessionsIncluded}
              </strong>{" "}
              {serviceLabel}s.
            </span>
            <span className="block">
              This new {serviceLabel} will be billed as an additional charge of{" "}
              <strong className="inline-flex items-center">
                <IndianRupee size={12} />
                {Number(ratePerSession || 0).toLocaleString("en-IN")}
              </strong>
              .
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-300">
          Confirm with the patient before proceeding. Billing will be raised on session save.
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onBillAsExtra}
          >
            Bill as Extra ({formatINR(ratePerSession)})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageExhaustedModal;
