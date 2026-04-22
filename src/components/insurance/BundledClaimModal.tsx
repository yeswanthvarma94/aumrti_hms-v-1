import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, AlertTriangle, FileWarning } from "lucide-react";
import { formatINR } from "@/lib/currency";

interface AdmissionOption {
  id: string;
  label: string;
  patient_id: string;
  patient_name: string;
  insurance_type: string | null;
}

interface BillRow {
  id: string;
  bill_number: string;
  bill_type: string;
  bill_date: string;
  total_amount: number;
  bill_status: string;
  payment_status: string;
}

interface MissingChargeWarning {
  type: "lab" | "radiology";
  count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  initialAdmission?: AdmissionOption | null;
  onSubmitted?: () => void;
}

const TYPE_ORDER = ["ipd", "pharmacy", "lab", "radiology", "ot", "blood_bank", "dialysis", "nursing", "ayush", "physio", "dental", "vaccination", "ivf", "package", "telemedicine", "opd", "other"];
const labelForType = (t: string) => {
  const map: Record<string, string> = {
    ipd: "IPD / Room", pharmacy: "Pharmacy", lab: "Laboratory", radiology: "Radiology",
    ot: "Operation Theatre", blood_bank: "Blood Bank", dialysis: "Dialysis", nursing: "Nursing",
    ayush: "AYUSH", physio: "Physiotherapy", dental: "Dental", vaccination: "Vaccination",
    ivf: "IVF / ART", package: "Health Package", telemedicine: "Telemedicine", opd: "OPD", other: "Other",
  };
  return map[t] || t;
};

const BundledClaimModal: React.FC<Props> = ({ open, onClose, hospitalId, initialAdmission, onSubmitted }) => {
  const [admissions, setAdmissions] = useState<AdmissionOption[]>([]);
  const [admissionId, setAdmissionId] = useState<string>("");
  const [admissionMeta, setAdmissionMeta] = useState<AdmissionOption | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [missing, setMissing] = useState<MissingChargeWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tpaName, setTpaName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [creatingMissing, setCreatingMissing] = useState(false);

  // Load list of insurance admissions
  useEffect(() => {
    if (!open || !hospitalId) return;
    if (initialAdmission) {
      setAdmissionId(initialAdmission.id);
      setAdmissionMeta(initialAdmission);
      setAdmissions([initialAdmission]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("admissions")
        .select("id, patient_id, insurance_type, patients(full_name, uhid)")
        .eq("hospital_id", hospitalId)
        .neq("insurance_type", "self_pay")
        .order("admitted_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error("Load admissions failed:", error.message);
        toast.error("Failed to load admissions. Please try again.");
        return;
      }
      const opts: AdmissionOption[] = (data || []).map((a: any) => ({
        id: a.id,
        patient_id: a.patient_id,
        patient_name: a.patients?.full_name || "Unknown",
        insurance_type: a.insurance_type,
        label: `${a.patients?.full_name || "Unknown"} · ${a.patients?.uhid || a.id.slice(0, 8)} · ${a.insurance_type}`,
      }));
      setAdmissions(opts);
    })();
  }, [open, hospitalId, initialAdmission]);

  // Load bills + missing charges whenever admission changes
  useEffect(() => {
    if (!admissionId || !hospitalId) {
      setBills([]);
      setIncludedIds(new Set());
      setMissing([]);
      return;
    }
    loadBillsAndChecks();
  }, [admissionId, hospitalId]);

  const loadBillsAndChecks = async () => {
    setLoading(true);
    try {
      const meta = admissions.find(a => a.id === admissionId) || admissionMeta;
      if (meta) {
        setAdmissionMeta(meta);
        if (!tpaName) setTpaName(meta.insurance_type || "");
      }

      // 1a. Bills for the admission
      const { data: billRows, error: billErr } = await supabase
        .from("bills")
        .select("id, bill_number, bill_type, bill_date, total_amount, bill_status, payment_status")
        .eq("admission_id", admissionId)
        .eq("hospital_id", hospitalId)
        .neq("bill_status", "cancelled")
        .order("bill_date", { ascending: true });
      if (billErr) {
        console.error("Load bills failed:", billErr.message);
        toast.error("Failed to load bills. Please try again.");
        setBills([]);
      } else {
        const safe = (billRows || []) as BillRow[];
        setBills(safe);
        setIncludedIds(new Set(safe.map(b => b.id)));
      }

      // Missing charges check
      const warnings: MissingChargeWarning[] = [];
      const billTypesPresent = new Set((billRows || []).map(b => b.bill_type));

      // Lab check
      const { data: labOrders } = await supabase
        .from("lab_orders")
        .select("id, lab_order_items(id, status)")
        .eq("admission_id", admissionId);
      let reportedLabItems = 0;
      (labOrders || []).forEach((o: any) => {
        (o.lab_order_items || []).forEach((it: any) => {
          if (["reported", "validated", "resulted"].includes(it.status)) reportedLabItems++;
        });
      });
      if (reportedLabItems > 0 && !billTypesPresent.has("lab")) {
        warnings.push({ type: "lab", count: reportedLabItems });
      }

      // Radiology check
      const { data: radOrders } = await supabase
        .from("radiology_orders")
        .select("id, status")
        .eq("admission_id", admissionId)
        .in("status", ["reported", "validated"]);
      const reportedRad = (radOrders || []).length;
      if (reportedRad > 0 && !billTypesPresent.has("radiology")) {
        warnings.push({ type: "radiology", count: reportedRad });
      }

      setMissing(warnings);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, BillRow[]>();
    bills.forEach(b => {
      const key = TYPE_ORDER.includes(b.bill_type) ? b.bill_type : "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return TYPE_ORDER.filter(t => map.has(t)).map(t => ({ type: t, items: map.get(t)! }));
  }, [bills]);

  const claimTotal = useMemo(() => {
    return bills.filter(b => includedIds.has(b.id)).reduce((s, b) => s + Number(b.total_amount || 0), 0);
  }, [bills, includedIds]);

  const toggleBill = (id: string) => {
    setIncludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (items: BillRow[], all: boolean) => {
    setIncludedIds(prev => {
      const next = new Set(prev);
      items.forEach(i => { if (all) next.add(i.id); else next.delete(i.id); });
      return next;
    });
  };

  const handleCreateMissingBills = async () => {
    setCreatingMissing(true);
    toast.info("Open Lab/Radiology billing and finalise charges, then refresh this dialog.", { duration: 5000 });
    setCreatingMissing(false);
  };

  const handleSubmit = async () => {
    if (!admissionId || !admissionMeta) {
      toast.error("Please select an admission");
      return;
    }
    if (includedIds.size === 0) {
      toast.error("Select at least one bill to include in the claim");
      return;
    }
    if (!tpaName.trim()) {
      toast.error("TPA / Insurer name is required");
      return;
    }

    setSubmitting(true);
    try {
      const includedArr = Array.from(includedIds);
      const includedBills = bills.filter(b => includedIds.has(b.id));
      const primaryBill = includedBills.find(b => b.bill_type === "ipd") || includedBills[0];

      const { data: { user } } = await supabase.auth.getUser();
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user?.id || "")
        .maybeSingle();

      const claimNumber = `CLM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

      // Stash bundle metadata in documents_submitted JSONB (schema-tolerant fallback
      // for included_bill_ids[], admission_id, policy_number, claim_date).
      const bundleMeta = {
        bundle_version: 1,
        included_bill_ids: includedArr,
        admission_id: admissionId,
        policy_number: policyNumber.trim() || null,
        claim_date: new Date().toISOString().slice(0, 10),
        bills_summary: includedBills.map(b => ({
          bill_id: b.id,
          bill_number: b.bill_number,
          bill_type: b.bill_type,
          amount: Number(b.total_amount || 0),
        })),
      };

      const { data: claim, error: claimErr } = await supabase
        .from("insurance_claims")
        .insert({
          hospital_id: hospitalId,
          patient_id: admissionMeta.patient_id,
          bill_id: primaryBill.id,
          tpa_name: tpaName.trim(),
          claim_number: claimNumber,
          claimed_amount: claimTotal,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by: userRow?.id || null,
          documents_submitted: bundleMeta as any,
          notes: policyNumber.trim() ? `Policy #: ${policyNumber.trim()}` : null,
        })
        .select("id")
        .maybeSingle();
      if (claimErr) {
        console.error("Claim insert failed:", claimErr.message);
        toast.error(`Failed to submit claim: ${claimErr.message}`);
        return;
      }

      // Try to back-link bills via insurance_claim_id (column may not exist yet → ignore error)
      if (claim?.id) {
        const { error: linkErr } = await (supabase as any)
          .from("bills")
          .update({ insurance_claim_id: claim.id })
          .in("id", includedArr);
        if (linkErr && !/column .* does not exist/i.test(linkErr.message)) {
          console.warn("Bill back-link skipped:", linkErr.message);
        }
      }

      toast.success(`Claim ${claimNumber} submitted with ${includedArr.length} bills (${formatINR(claimTotal)})`);
      onSubmitted?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send size={16} /> New Bundled Insurance Claim
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admission picker */}
          {!initialAdmission && (
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Select Admission</Label>
              <select
                value={admissionId}
                onChange={(e) => setAdmissionId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-[13px]"
              >
                <option value="">— Choose an insurance admission —</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
          )}

          {admissionMeta && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-muted-foreground">Patient:</span> <strong>{admissionMeta.patient_name}</strong></span>
              <span><span className="text-muted-foreground">Insurance:</span> {admissionMeta.insurance_type}</span>
            </div>
          )}

          {/* Missing charges alert */}
          {missing.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground">
                  Warning: {missing.map(m => `${m.count} ${m.type}`).join(" + ")} investigation{missing.reduce((s, m) => s + m.count, 0) > 1 ? "s" : ""} have no bill.
                </p>
                <p className="text-[11px] text-muted-foreground">Create bills before submitting claim?</p>
              </div>
              <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1" onClick={handleCreateMissingBills} disabled={creatingMissing}>
                <FileWarning size={12} /> Create Missing Bills
              </Button>
            </div>
          )}

          {/* Bills table grouped by type */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Charges Summary for This Admission</Label>
              <span className="text-[11px] text-muted-foreground">{bills.length} bills</span>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold w-[28%]">Department</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Bill No</th>
                    <th className="text-left px-2 py-1.5 font-semibold w-[90px]">Bill Date</th>
                    <th className="text-right px-2 py-1.5 font-semibold w-[100px]">Amount</th>
                    <th className="text-center px-2 py-1.5 font-semibold w-[70px]">Include</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} className="text-center py-6 text-muted-foreground"><Loader2 size={14} className="animate-spin inline mr-1" />Loading bills…</td></tr>
                  )}
                  {!loading && bills.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No bills for this admission yet.</td></tr>
                  )}
                  {grouped.map(group => {
                    const allChecked = group.items.every(b => includedIds.has(b.id));
                    return (
                      <React.Fragment key={group.type}>
                        <tr className="bg-muted/20">
                          <td colSpan={4} className="px-2 py-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">{labelForType(group.type)}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground">{group.items.length} bill{group.items.length > 1 ? "s" : ""}</span>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Checkbox checked={allChecked} onCheckedChange={(v) => toggleGroup(group.items, !!v)} />
                          </td>
                        </tr>
                        {group.items.map(b => (
                          <tr key={b.id} className="border-t border-border/40">
                            <td className="px-2 py-1.5 pl-6 text-muted-foreground">{labelForType(b.bill_type)}</td>
                            <td className="px-2 py-1.5 font-mono text-[11px]">{b.bill_number}</td>
                            <td className="px-2 py-1.5 text-muted-foreground text-[11px]">{new Date(b.bill_date).toLocaleDateString("en-IN")}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums font-medium">{formatINR(Number(b.total_amount || 0))}</td>
                            <td className="px-2 py-1.5 text-center">
                              <Checkbox checked={includedIds.has(b.id)} onCheckedChange={() => toggleBill(b.id)} />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {bills.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={3} className="px-2 py-2 text-right font-semibold text-[12px]">Claim Total ({includedIds.size} bills)</td>
                      <td className="px-2 py-2 text-right tabular-nums font-bold text-[13px]">{formatINR(claimTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* TPA + policy fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">TPA / Insurer</Label>
              <Input className="mt-1 h-9 text-[12px]" value={tpaName} onChange={e => setTpaName(e.target.value)} placeholder="e.g. Star Health" />
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Policy Number</Label>
              <Input className="mt-1 h-9 text-[12px]" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Badge variant="outline" className="text-[10px]">Claim Date: {new Date().toLocaleDateString("en-IN")}</Badge>
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !admissionId || includedIds.size === 0} className="gap-1">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting</> : <><Send size={14} /> Submit Bundled Claim</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BundledClaimModal;
