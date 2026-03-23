import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BillRecord } from "@/pages/billing/BillingPage";

interface Props {
  bill: BillRecord;
  hospitalId: string | null;
  onRefresh: () => void;
}

const InsuranceTab: React.FC<Props> = ({ bill, hospitalId, onRefresh }) => {
  const { toast } = useToast();
  const [tpaName, setTpaName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [preAuthNumber, setPreAuthNumber] = useState("");
  const [coverageType, setCoverageType] = useState<"cashless" | "reimbursement">("cashless");
  const [coveredAmount, setCoveredAmount] = useState("");

  const handleSave = async () => {
    const amt = Number(coveredAmount) || 0;
    const patientPayable = bill.total_amount - bill.advance_received - amt;
    const balanceDue = patientPayable - bill.paid_amount;
    await supabase.from("bills").update({
      insurance_amount: amt,
      patient_payable: Math.max(0, patientPayable),
      balance_due: Math.max(0, balanceDue),
      notes: `TPA: ${tpaName}, Policy: ${policyNumber}, Pre-Auth: ${preAuthNumber}, Coverage: ${coverageType}`,
    }).eq("id", bill.id);
    toast({ title: "Insurance details saved" });
    onRefresh();
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-sm font-bold mb-3">Insurance / TPA Details</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase text-muted-foreground">TPA / Insurer Name</label>
            <Input value={tpaName} onChange={(e) => setTpaName(e.target.value)} placeholder="e.g. Star Health, ICICI Lombard" className="h-9 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-muted-foreground">Policy Number</label>
            <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-muted-foreground">Pre-Auth Number</label>
            <Input value={preAuthNumber} onChange={(e) => setPreAuthNumber(e.target.value)} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-muted-foreground">Coverage Type</label>
            <div className="flex gap-2 mt-1">
              {(["cashless", "reimbursement"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCoverageType(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                    coverageType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted/50"
                  )}
                >
                  {t === "cashless" ? "Cashless" : "Reimbursement"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-muted-foreground">Covered Amount (₹)</label>
            <Input type="number" value={coveredAmount} onChange={(e) => setCoveredAmount(e.target.value)} className="h-9 text-sm mt-1" />
          </div>
          <Button onClick={handleSave} className="w-full h-10">Save Insurance Details</Button>
        </div>
      </div>
    </div>
  );
};

export default InsuranceTab;
