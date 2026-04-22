import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { autoPostJournalEntry } from "@/lib/accounting";
import { logAudit } from "@/lib/auditLog";
import { calcGST } from "@/lib/currency";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrugMatch {
  id: string;
  drug_name: string;
  generic_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  is_ndps: boolean;
  drug_schedule?: string | null;
}

interface BatchInfo {
  id: string;
  mrp: number;
  sale_price: number;
  gst_percent: number;
  quantity_available: number;
}

interface Props {
  hospitalId: string;
  admissionId?: string | null;
  patientId?: string | null;
  patientName?: string;
  onDispensed?: () => void;
}

const REASONS = ["Verbal Order", "Emergency", "Ward Stock", "Doctor Unavailable"];
const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhalation", "Sublingual", "Rectal"];

const EmergencyDispensePanel: React.FC<Props> = ({ hospitalId, admissionId, patientId, patientName, onDispensed }) => {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<DrugMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<DrugMatch | null>(null);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [strength, setStrength] = useState("");
  const [form, setForm] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [route, setRoute] = useState("Oral");
  const [reason, setReason] = useState(REASONS[0]);
  const [authorisedBy, setAuthorisedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced drug search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search || search.length < 2 || selectedDrug) {
      setMatches([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("drug_master")
        .select("id, drug_name, generic_name, strength, dosage_form, is_ndps, drug_schedule")
        .eq("hospital_id", hospitalId)
        .or(`drug_name.ilike.%${search}%,generic_name.ilike.%${search}%`)
        .limit(8);
      if (error) {
        console.error("Drug search failed:", error.message);
        toast.error("Drug search failed. Please try again.");
        setMatches([]);
      } else {
        setMatches((data || []) as DrugMatch[]);
      }
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, hospitalId, selectedDrug]);

  const pickDrug = async (d: DrugMatch) => {
    setSelectedDrug(d);
    setSearch(d.drug_name);
    setStrength(d.strength || "");
    setForm(d.dosage_form || "");
    setMatches([]);

    // Pull latest batch (FEFO) for pricing
    const { data: batchData, error } = await supabase
      .from("drug_batches")
      .select("id, mrp, sale_price, gst_percent, quantity_available")
      .eq("hospital_id", hospitalId)
      .eq("drug_id", d.id)
      .gt("quantity_available", 0)
      .gt("expiry_date", new Date().toISOString().split("T")[0])
      .eq("is_active", true)
      .order("expiry_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("Batch lookup failed:", error.message);
    }
    setBatch(batchData as BatchInfo | null);
  };

  const reset = () => {
    setSearch("");
    setSelectedDrug(null);
    setBatch(null);
    setStrength("");
    setForm("");
    setQuantity(1);
    setRoute("Oral");
    setReason(REASONS[0]);
    setAuthorisedBy("");
  };

  const handleSubmit = async () => {
    if (!selectedDrug) {
      toast.error("Please select a drug from the list");
      return;
    }
    if (selectedDrug.is_ndps) {
      toast.error("NDPS drugs cannot be dispensed without a signed order. Contact duty doctor.");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!authorisedBy.trim()) {
      toast.error("Please enter who authorised this dispense");
      return;
    }
    if (!patientId) {
      toast.error("Patient is required for emergency dispense");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (userErr) throw userErr;
      if (!userData) throw new Error("User profile not found");

      const unitPrice = batch?.mrp || batch?.sale_price || 0;
      const subtotal = unitPrice * quantity;
      const gstPercent = batch?.gst_percent ?? 5;
      const gstAmount = calcGST(subtotal, gstPercent);
      const total = subtotal + gstAmount;

      // 1. Insert pharmacy_dispensing (emergency/verbal)
      const dispNum = `EDISP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
      const { data: disp, error: dispErr } = await (supabase as any)
        .from("pharmacy_dispensing")
        .insert({
          hospital_id: hospitalId,
          dispensing_number: dispNum,
          patient_id: patientId,
          admission_id: admissionId || null,
          dispensed_by: userData.id,
          dispensing_type: "ip",
          status: "dispensed",
          source: "emergency_verbal",
          reason,
          authorised_by: authorisedBy.trim(),
          total_amount: total,
          net_amount: total,
        })
        .select("id")
        .maybeSingle();
      if (dispErr) throw dispErr;

      // 2. Insert dispensing item
      if (disp?.id) {
        await (supabase as any).from("pharmacy_dispensing_items").insert({
          hospital_id: hospitalId,
          dispensing_id: disp.id,
          drug_id: selectedDrug.id,
          batch_id: batch?.id || null,
          drug_name: selectedDrug.drug_name,
          quantity_requested: quantity,
          quantity_dispensed: quantity,
          unit_price: unitPrice,
          gst_percent: gstPercent,
          total_price: subtotal,
          five_rights_verified: false,
          is_ndps: false,
        });

        // Decrement batch stock if available
        if (batch?.id) {
          await supabase
            .from("drug_batches")
            .update({ quantity_available: Math.max(0, batch.quantity_available - quantity) })
            .eq("id", batch.id);
        }
      }

      // 3. Auto-create pharmacy bill
      const billNum = await generateBillNumber(hospitalId, "PHARM");
      const { data: bill, error: billErr } = await supabase
        .from("bills")
        .insert({
          hospital_id: hospitalId,
          patient_id: patientId,
          admission_id: admissionId || null,
          bill_number: billNum,
          bill_type: "pharmacy",
          bill_status: "draft",
          bill_date: new Date().toISOString().split("T")[0],
          subtotal,
          gst_amount: gstAmount,
          total_amount: total,
          paid_amount: 0,
          balance_due: total,
          payment_status: "unpaid",
          created_by: userData.id,
        })
        .select("id")
        .maybeSingle();
      if (billErr) throw billErr;

      if (bill?.id) {
        await (supabase as any).from("bill_line_items").insert({
          hospital_id: hospitalId,
          bill_id: bill.id,
          item_type: "pharmacy",
          description: `${selectedDrug.drug_name}${strength ? ` ${strength}` : ""}${form ? ` (${form})` : ""} — Emergency/Verbal`,
          quantity,
          unit_price: unitPrice,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          total_amount: total,
        });

        // 4. Auto-post journal entry
        await autoPostJournalEntry({
          triggerEvent: "bill_finalized_pharmacy",
          sourceModule: "pharmacy",
          sourceId: bill.id,
          amount: total,
          description: `Pharmacy Revenue (Emergency) - Bill ${billNum}`,
          hospitalId,
          postedBy: userData.id,
        });
      }

      // 5. Audit log
      await logAudit({
        action: "emergency_verbal_dispense",
        module: "pharmacy",
        entityType: "pharmacy_dispensing",
        entityId: disp?.id,
        details: {
          drug: selectedDrug.drug_name,
          strength,
          form,
          quantity,
          route,
          reason,
          authorised_by: authorisedBy.trim(),
          patient_id: patientId,
          patient_name: patientName,
          admission_id: admissionId,
          bill_number: billNum,
          amount: total,
        },
      });

      // NOTE: We intentionally DO NOT set admissions.pharmacy_cleared here —
      // emergency dispenses must not auto-clear pharmacy step.

      toast.warning("Emergency dispense recorded. Bill auto-created. Verify with prescribing doctor.", {
        description: `${selectedDrug.drug_name} × ${quantity} — Bill ${billNum} (₹${total.toFixed(0)})`,
        duration: 6000,
      });
      reset();
      onDispensed?.();
    } catch (err: any) {
      console.error("Emergency dispense failed:", err);
      toast.error(err.message || "Emergency dispense failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isNdps = selectedDrug?.is_ndps === true;

  return (
    <div className="flex-shrink-0 border-t-2 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 px-5 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-amber-600" />
        <h3 className="text-[13px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
          Emergency / Verbal Order Dispense
        </h3>
        <span className="text-[10px] text-muted-foreground">— Use only when prescription unavailable</span>
      </div>

      {isNdps && (
        <div className="mb-2 flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2 text-[12px] text-destructive font-medium">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>NDPS drugs cannot be dispensed without a signed order. Contact duty doctor.</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-2">
        {/* Drug search */}
        <div className="col-span-4 relative">
          <Input
            placeholder="Search drug name..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (selectedDrug && e.target.value !== selectedDrug.drug_name) {
                setSelectedDrug(null);
                setBatch(null);
              }
            }}
            className="h-9 text-[12px]"
          />
          {searching && (
            <Loader2 size={12} className="absolute right-2 top-2.5 animate-spin text-muted-foreground" />
          )}
          {matches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
              {matches.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickDrug(m)}
                  className="w-full text-left px-2 py-1.5 hover:bg-accent text-[12px] border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{m.drug_name}</span>
                    {m.is_ndps && (
                      <span className="text-[9px] px-1 rounded bg-destructive/15 text-destructive font-bold">NDPS</span>
                    )}
                  </div>
                  {m.generic_name && <p className="text-[10px] text-muted-foreground">{m.generic_name}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          placeholder="Strength"
          value={strength}
          onChange={e => setStrength(e.target.value)}
          className="col-span-2 h-9 text-[12px]"
        />
        <Input
          placeholder="Form"
          value={form}
          onChange={e => setForm(e.target.value)}
          className="col-span-2 h-9 text-[12px]"
        />
        <Input
          type="number"
          min={1}
          placeholder="Qty"
          value={quantity}
          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="col-span-1 h-9 text-[12px] text-center"
        />
        <Select value={route} onValueChange={setRoute}>
          <SelectTrigger className="col-span-1 h-9 text-[12px]">
            <SelectValue placeholder="Route" />
          </SelectTrigger>
          <SelectContent>
            {ROUTES.map(r => (
              <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="col-span-2 h-9 text-[12px]">
            <SelectValue placeholder="Reason" />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map(r => (
              <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Authorised by (Dr. name)"
          value={authorisedBy}
          onChange={e => setAuthorisedBy(e.target.value)}
          className="col-span-8 h-9 text-[12px]"
        />
        <div className="col-span-2 text-[11px] text-muted-foreground flex items-center px-1">
          {batch ? `₹${batch.mrp} × ${quantity}` : selectedDrug ? "No batch" : ""}
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !selectedDrug || isNdps}
          className={cn(
            "col-span-2 h-9 text-[12px] font-bold",
            "bg-amber-600 hover:bg-amber-700 text-white"
          )}
        >
          {submitting ? <><Loader2 size={12} className="mr-1 animate-spin" />Saving</> : <><Zap size={12} className="mr-1" />Dispense</>}
        </Button>
      </div>
    </div>
  );
};

export default EmergencyDispensePanel;
