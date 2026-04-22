import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { autoPostJournalEntry } from "@/lib/accounting";
import { calcGST, roundCurrency } from "@/lib/currency";
import { recalculateBillTotalsSafe } from "@/lib/billTotals";
import { getRate, SERVICE_RATE_CODES } from "@/lib/serviceRates";
import { useToast } from "@/hooks/use-toast";
import type { OTSchedule } from "@/pages/ot/OTPage";

interface Props {
  schedule: OTSchedule;
  onClose: () => void;
  onEnded: () => void;
}

interface InventoryItemRow {
  id: string;
  item_name: string;
  category: string | null;
  uom: string | null;
}

interface ConsumableRow {
  uid: string;
  item_id: string;
  item_name: string;
  batch_no: string;
  quantity: number;
  unit_cost: number;
  stock_id: string | null; // inventory_stock row to decrement
  available: number;
}

const CONSUMABLE_CATEGORIES = ["implant", "consumable", "suture", "surgical_supply"];

const EndCaseModal: React.FC<Props> = ({ schedule, onClose, onEnded }) => {
  const { toast } = useToast();
  const [postOpDx, setPostOpDx] = useState("");
  const [outcome, setOutcome] = useState("success");
  const [complications, setComplications] = useState("");
  const [saving, setSaving] = useState(false);

  // Consumables state
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItemRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState<ConsumableRow[]>([]);
  const [skipMode, setSkipMode] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const elapsed = schedule.actual_start_time
    ? Math.round((Date.now() - new Date(schedule.actual_start_time).getTime()) / 60000)
    : 0;

  // Resolve hospital_id once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_user_hospital_id") as any;
      if (data) setHospitalId(data as string);
    })();
  }, []);

  // Debounced inventory search
  useEffect(() => {
    if (!hospitalId || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, item_name, category, uom")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .in("category", CONSUMABLE_CATEGORIES)
        .ilike("item_name", `%${searchQ.trim()}%`)
        .limit(10);
      if (error) {
        console.error("Inventory search failed:", error.message);
        toast({ title: "Search failed", description: error.message, variant: "destructive" });
        setSearchResults([]);
      } else {
        setSearchResults((data as InventoryItemRow[]) || []);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, hospitalId, toast]);

  const addItem = async (item: InventoryItemRow) => {
    if (!hospitalId) return;
    // Find latest available batch
    const { data: batch } = await supabase
      .from("inventory_stock")
      .select("id, batch_number, cost_price, quantity_available, last_received_date")
      .eq("hospital_id", hospitalId)
      .eq("item_id", item.id)
      .gt("quantity_available", 0)
      .order("last_received_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    setRows((prev) => [
      ...prev,
      {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        item_id: item.id,
        item_name: item.item_name,
        batch_no: batch?.batch_number || "",
        quantity: 1,
        unit_cost: Number(batch?.cost_price) || 0,
        stock_id: batch?.id || null,
        available: Number(batch?.quantity_available) || 0,
      },
    ]);
    setSearchQ("");
    setSearchResults([]);
  };

  const updateRow = (uid: string, patch: Partial<ConsumableRow>) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  };

  const removeRow = (uid: string) => setRows((prev) => prev.filter((r) => r.uid !== uid));

  const consumablesTotal = useMemo(
    () => roundCurrency(rows.reduce((sum, r) => sum + r.unit_cost * r.quantity, 0)),
    [rows]
  );

  const canSubmit = rows.length > 0 || (skipMode && skipReason.trim().length >= 10);

  const triggerOTBilling = async (otSchedule: OTSchedule, hid: string) => {
    if (!otSchedule.admission_id) {
      toast({ title: "OT completed. Create bill manually for OPD procedure." });
      return;
    }

    // Find or create IPD bill
    const { data: existingBill } = await supabase
      .from("bills")
      .select("id, total_amount, balance_due")
      .eq("hospital_id", hid)
      .eq("admission_id", otSchedule.admission_id)
      .eq("bill_type", "ipd")
      .maybeSingle();

    let billId = existingBill?.id;

    if (!billId) {
      const today = new Date().toISOString().split("T")[0];
      const billNum = await generateBillNumber(hid, "BILL");
      const { data: newBill } = await supabase
        .from("bills")
        .insert({
          hospital_id: hid,
          patient_id: otSchedule.patient_id,
          admission_id: otSchedule.admission_id,
          bill_number: billNum,
          bill_type: "ipd",
          bill_date: today,
          bill_status: "draft",
          payment_status: "unpaid",
          total_amount: 0,
          balance_due: 0,
        })
        .select("id")
        .maybeSingle();
      billId = newBill?.id;
    }

    if (!billId) return;

    // Fetch rates from service_master (per-procedure overrides)
    const getServiceMasterRate = async (itemType: string, fallback: number) => {
      const { data } = await supabase
        .from("service_master")
        .select("fee, gst_percent, gst_applicable, hsn_code")
        .eq("hospital_id", hid)
        .eq("item_type", itemType)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!data) return { fee: fallback, gstPct: 0, gst: 0, hsn: "" };
      const fee = Number(data.fee) || fallback;
      const gstPct = data.gst_applicable ? (Number(data.gst_percent) || 0) : 0;
      return { fee, gstPct, gst: calcGST(fee, gstPct), hsn: data.hsn_code || "" };
    };

    const anaesFallback = await getRate(hid, SERVICE_RATE_CODES.ANAESTHESIA_FEE, 1500);
    const surgeryFallback = await getRate(hid, SERVICE_RATE_CODES.SURGERY_FEE, 5000);

    const otRate = await getServiceMasterRate("ot_charge", 2000);
    const surgRate = await getServiceMasterRate("surgeon_fee", surgeryFallback);
    const anaesRate = await getServiceMasterRate("anaesthesia_fee", anaesFallback);

    const actualDuration =
      otSchedule.actual_start_time && otSchedule.actual_end_time
        ? Math.ceil(
            (new Date(otSchedule.actual_end_time).getTime() -
              new Date(otSchedule.actual_start_time).getTime()) /
              3600000
          )
        : Math.ceil((otSchedule.estimated_duration_minutes || 60) / 60);

    const hours = Math.max(1, actualDuration);
    const otTimeCharge = roundCurrency(hours * otRate.fee);
    const otTimeGst = calcGST(otTimeCharge, otRate.gstPct);

    const lineItems: any[] = [];

    lineItems.push({
      hospital_id: hid, bill_id: billId,
      item_type: "ot_charge",
      description: `OT Charges: ${otSchedule.surgery_name} (${hours} hr)`,
      quantity: hours, unit_rate: otRate.fee,
      taxable_amount: otTimeCharge, gst_percent: otRate.gstPct,
      gst_amount: otTimeGst, total_amount: otTimeCharge + otTimeGst,
      hsn_code: otRate.hsn || "999315", source_module: "ot",
    });

    if (otSchedule.surgeon_id) {
      lineItems.push({
        hospital_id: hid, bill_id: billId,
        item_type: "surgeon_fee",
        description: `Surgeon Fee: ${otSchedule.surgery_name}`,
        quantity: 1, unit_rate: surgRate.fee,
        taxable_amount: surgRate.fee, gst_percent: surgRate.gstPct,
        gst_amount: surgRate.gst, total_amount: surgRate.fee + surgRate.gst,
        hsn_code: surgRate.hsn || "999316", source_module: "ot",
      });
    }

    if (otSchedule.anaesthetist_id) {
      lineItems.push({
        hospital_id: hid, bill_id: billId,
        item_type: "anaesthesia_fee",
        description: `Anaesthesia: ${otSchedule.anaesthesia_type || "General"}`,
        quantity: 1, unit_rate: anaesRate.fee,
        taxable_amount: anaesRate.fee, gst_percent: anaesRate.gstPct,
        gst_amount: anaesRate.gst, total_amount: anaesRate.fee + anaesRate.gst,
        hsn_code: anaesRate.hsn || "999317", source_module: "ot",
      });
    }

    // Implants/consumables (now sourced from ot_schedules.implants_consumables which we wrote above)
    const implants = otSchedule.implants_consumables as any[];
    if (implants?.length) {
      for (const imp of implants) {
        const cost = Number(imp.cost || imp.unit_cost || imp.price || 0);
        const qty = Number(imp.quantity || 1);
        if (cost > 0) {
          const taxable = roundCurrency(cost * qty);
          lineItems.push({
            hospital_id: hid, bill_id: billId,
            item_type: imp.item_type || "implant",
            description: `${imp.item_type === "consumable" || imp.item_type === "suture" || imp.item_type === "surgical_supply" ? "Consumable" : "Implant"}: ${imp.name || imp.item_name || "Surgical Item"}${imp.batch_no ? ` (Batch ${imp.batch_no})` : ""}`,
            quantity: qty, unit_rate: cost,
            taxable_amount: taxable, gst_percent: 12,
            gst_amount: calcGST(taxable, 12),
            total_amount: roundCurrency(taxable + calcGST(taxable, 12)),
            hsn_code: "9021", source_module: "ot",
          });
        }
      }
    }

    if (lineItems.length > 0) {
      await supabase.from("bill_line_items").insert(lineItems);

      const result = await recalculateBillTotalsSafe(billId);
      if (!result.ok) {
        console.error("OT bill recalculation failed:", result.error);
        toast({ title: "OT bill totals need refresh", description: result.error || "Charges were added but totals could not be updated", variant: "destructive" });
      }

      const { data: updatedBill } = await supabase.from("bills").select("total_amount").eq("id", billId).maybeSingle();
      const total = Number(updatedBill?.total_amount || 0);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      await autoPostJournalEntry({
        triggerEvent: "bill_finalized_ot",
        sourceModule: "ot",
        sourceId: billId,
        amount: total,
        description: `OT Revenue - ${otSchedule.surgery_name}`,
        hospitalId: hid,
        postedBy: authUser?.id || "",
      });

      toast({ title: `OT charges auto-billed: ₹${total.toLocaleString("en-IN")}` });
    }
  };

  const handleEnd = async () => {
    if (!canSubmit) {
      toast({
        title: skipMode
          ? "Reason must be at least 10 characters"
          : "Add consumables or use 'Skip (No Consumables Used)'",
        variant: "destructive",
      });
      return;
    }

    // Validate quantities don't exceed stock
    for (const r of rows) {
      if (r.quantity <= 0) {
        toast({ title: `${r.item_name}: quantity must be greater than zero`, variant: "destructive" });
        return;
      }
      if (r.stock_id && r.quantity > r.available) {
        toast({
          title: `${r.item_name}: only ${r.available} available in batch ${r.batch_no || "—"}`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    const endTime = new Date().toISOString();
    const hid = hospitalId;

    // Build consumables payload merged with any pre-existing implants on the schedule
    const existingImplants = Array.isArray(schedule.implants_consumables)
      ? (schedule.implants_consumables as any[])
      : [];
    const newConsumables = rows.map((r) => ({
      item_id: r.item_id,
      item_name: r.item_name,
      name: r.item_name,
      batch_no: r.batch_no || null,
      quantity: r.quantity,
      unit_cost: r.unit_cost,
      cost: r.unit_cost,
      total_cost: roundCurrency(r.unit_cost * r.quantity),
      item_type: "consumable",
      added_at: endTime,
    }));
    const mergedImplants = [...existingImplants, ...newConsumables];

    const skipNote = skipMode && skipReason.trim()
      ? `\n\nNo consumables used. Reason: ${skipReason.trim()}`
      : "";

    const { error } = await supabase
      .from("ot_schedules")
      .update({
        status: "completed",
        actual_end_time: endTime,
        post_op_diagnosis: postOpDx || null,
        implants_consumables: mergedImplants as any,
        booking_notes: (() => {
          const base = schedule.booking_notes || "";
          const compNote = complications ? `\n\nComplications: ${complications}` : "";
          return `${base}${compNote}${skipNote}`.trim() || null;
        })(),
      })
      .eq("id", schedule.id);

    if (error) {
      toast({ title: "Failed to end case", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Decrement inventory stock per batch (best-effort, non-blocking on individual failures)
    if (hid && rows.length > 0) {
      for (const r of rows) {
        if (!r.stock_id) continue;
        const newQty = Math.max(0, r.available - r.quantity);
        const { error: stockErr } = await supabase
          .from("inventory_stock")
          .update({ quantity_available: newQty })
          .eq("id", r.stock_id);
        if (stockErr) {
          console.error(`Stock decrement failed for ${r.item_name}:`, stockErr.message);
        }
      }
    }

    toast({ title: `Case completed ✓ — ${schedule.surgery_name} (${elapsed} min)` });

    if (hid) {
      await triggerOTBilling(
        { ...schedule, actual_end_time: endTime, status: "completed", implants_consumables: mergedImplants as any },
        hid
      );
    }

    setSaving(false);
    onEnded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold text-foreground">End Case</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 active:scale-95"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-bold text-foreground">{schedule.surgery_name}</p>
            <p className="text-xs text-muted-foreground">{schedule.patient?.full_name} · {elapsed} min elapsed</p>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Post-op Diagnosis</label>
            <input value={postOpDx} onChange={(e) => setPostOpDx(e.target.value)} placeholder="Final diagnosis after surgery" className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block">Case Outcome</label>
            <div className="space-y-2">
              {[
                { value: "success", label: "Completed Successfully" },
                { value: "complications", label: "Completed with Complications" },
                { value: "abandoned", label: "Abandoned / Converted" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${outcome === opt.value ? "border-primary" : "border-muted-foreground/30"}`}>
                    {outcome === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {outcome === "complications" && (
            <div>
              <label className="text-xs font-medium mb-1 block">Describe complications</label>
              <textarea value={complications} onChange={(e) => setComplications(e.target.value)} rows={2} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          )}

          {/* Consumables & Implants Section */}
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Consumables & Implants Used</h3>
              {!skipMode && rows.length === 0 && (
                <button
                  onClick={() => setSkipMode(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                  type="button"
                >
                  Skip (No Consumables Used)
                </button>
              )}
              {skipMode && (
                <button
                  onClick={() => { setSkipMode(false); setSkipReason(""); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                  type="button"
                >
                  Cancel skip
                </button>
              )}
            </div>

            {!skipMode && (
              <>
                <div className="relative">
                  <div className="flex items-center gap-2 border border-border rounded-md px-2 py-1.5 bg-background">
                    <Search size={14} className="text-muted-foreground" />
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Search implants, consumables, sutures..."
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                    {searching && <span className="text-[10px] text-muted-foreground">Searching…</span>}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                      {searchResults.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => addItem(it)}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between"
                        >
                          <span>
                            <Plus size={12} className="inline mr-1.5 text-primary" />
                            {it.item_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{it.category || "—"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {rows.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-2">
                    Search above to add items used during this surgery.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rows.map((r) => (
                      <div key={r.uid} className="border border-border rounded-md p-2 bg-background space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground truncate">{r.item_name}</span>
                          <button
                            type="button"
                            onClick={() => removeRow(r.uid)}
                            className="text-destructive hover:opacity-80 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-muted-foreground">Batch</label>
                            <input
                              value={r.batch_no}
                              onChange={(e) => updateRow(r.uid, { batch_no: e.target.value })}
                              placeholder="—"
                              className="w-full border border-border rounded px-2 py-1 bg-background text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">
                              Qty {r.stock_id ? `(${r.available} avail)` : ""}
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={r.quantity}
                              onChange={(e) => updateRow(r.uid, { quantity: Number(e.target.value) || 1 })}
                              className="w-full border border-border rounded px-2 py-1 bg-background text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Unit ₹</label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={r.unit_cost}
                              onChange={(e) => updateRow(r.uid, { unit_cost: Number(e.target.value) || 0 })}
                              className="w-full border border-border rounded px-2 py-1 bg-background text-xs"
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-right text-muted-foreground">
                          Total: ₹{roundCurrency(r.unit_cost * r.quantity).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <span className="text-xs font-medium text-foreground">Consumables Total</span>
                      <span className="text-sm font-bold text-foreground">
                        ₹{consumablesTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {skipMode && (
              <div>
                <label className="text-[11px] font-medium mb-1 block text-foreground">
                  Reason for no consumables (min 10 chars) *
                </label>
                <textarea
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Diagnostic-only procedure, no instruments deployed"
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {skipReason.trim().length}/10 characters
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-2">
          <button
            onClick={handleEnd}
            disabled={saving || !canSubmit}
            className="w-full bg-[hsl(var(--sidebar-accent))] text-white font-semibold py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Ending & Billing..." : "✓ End Case & Close OT"}
          </button>
          {!canSubmit && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              {skipMode
                ? "Enter a reason of at least 10 characters to skip."
                : "Add at least one consumable, or use 'Skip (No Consumables Used)'."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EndCaseModal;
