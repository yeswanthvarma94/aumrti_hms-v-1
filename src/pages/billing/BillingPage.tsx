import React, { useState, useEffect, useCallback } from "react";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { calcGST } from "@/lib/currency";
import { recalculateBillTotalsSafe } from "@/lib/billTotals";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import BillQueue from "@/components/billing/BillQueue";
import BillEditor from "@/components/billing/BillEditor";
import NewBillModal from "@/components/billing/NewBillModal";
import AdvanceReceiptModal from "@/components/billing/AdvanceReceiptModal";
import CollectionsTab from "@/components/billing/tabs/CollectionsTab";

export interface BillRecord {
  id: string;
  bill_number: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  encounter_id: string | null;
  admission_id: string | null;
  bill_type: string;
  bill_date: string;
  bill_status: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  advance_received: number;
  insurance_amount: number;
  patient_payable: number;
  paid_amount: number;
  balance_due: number;
  payment_status: string;
  notes: string | null;
  irn: string | null;
  irn_generated_at: string | null;
  created_at: string;
}

const BillingPage: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewBill, setShowNewBill] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [dischargeBillCreated, setDischargeBillCreated] = useState(false);
  const [activeTab, setActiveTab] = useState("bills");

  useEffect(() => {
    const loadHospital = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("hospital_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (data?.hospital_id) setHospitalId(data.hospital_id);
    };
    loadHospital();
  }, []);

  // Handle discharge billing URL params: /billing?action=new&admission_id=X&type=ipd
  useEffect(() => {
    if (!hospitalId || dischargeBillCreated) return;
    const action = searchParams.get("action");
    const admissionId = searchParams.get("admission_id");
    const billType = searchParams.get("type");
    if (action === "new" && admissionId && billType === "ipd") {
      createDischargeBill(admissionId);
    }
  }, [hospitalId, searchParams, dischargeBillCreated]);

  const createDischargeBill = async (admissionId: string) => {
    if (!hospitalId) return;
    setDischargeBillCreated(true);

    // Check if bill already exists for this admission
    const { data: existing } = await supabase
      .from("bills")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("admission_id", admissionId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Select existing bill
      await fetchBills();
      setSelectedBillId(existing[0].id);
      setSearchParams({});
      return;
    }

    // Get admission + patient info
    const { data: admission } = await supabase
      .from("admissions")
      .select("*, patients(id, full_name, uhid)")
      .eq("id", admissionId)
      .maybeSingle();

    if (!admission) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase.from("users").select("id")
      .eq("auth_user_id", user?.id || "").maybeSingle();

    const billNumber = await generateBillNumber(hospitalId, "BILL");

    const { data: newBill, error } = await supabase.from("bills").insert({
      hospital_id: hospitalId,
      bill_number: billNumber,
      patient_id: admission.patient_id,
      admission_id: admissionId,
      bill_type: "ipd",
      bill_status: "draft",
      created_by: userData?.id || null,
    }).select("id").maybeSingle();

    if (error || !newBill) {
      toast({ title: "Error creating discharge bill", variant: "destructive" });
      return;
    }

    // Auto-pull charges for this admission
    await autoPullAdmissionCharges(newBill.id, admissionId);

    toast({ title: `IPD Discharge Bill #${billNumber} created with auto-pulled charges` });
    await fetchBills();
    setSelectedBillId(newBill.id);
    setSearchParams({});
  };

  const autoPullAdmissionCharges = async (billId: string, admissionId: string) => {
    if (!hospitalId) return;
    const items: any[] = [];

    // Helper: look up rate from service_master with fallback
    const getServiceRate = async (itemType: string, fallback: number) => {
      const { data } = await supabase
        .from('service_master')
        .select('fee, gst_percent, gst_applicable, hsn_code')
        .eq('hospital_id', hospitalId)
        .eq('item_type', itemType)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (!data) return { fee: fallback, gst: 0, gstPct: 0, hsn: '' };
      const fee = Number(data.fee) || fallback;
      const gstPct = data.gst_applicable ? (Number(data.gst_percent) || 0) : 0;
      return {
        fee,
        gst: calcGST(fee, gstPct),
        gstPct,
        hsn: data.hsn_code || ''
      };
    };

    // Lab charges
    const { data: labOrders } = await supabase
      .from("lab_orders")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("admission_id", admissionId);

    if (labOrders?.length) {
      const orderIds = labOrders.map((o) => o.id);
      const { data: labItems } = await supabase
        .from("lab_order_items")
        .select("*, lab_test_master(test_name)")
        .in("lab_order_id", orderIds);

      const labRate = await getServiceRate('lab_test', 200);

      for (const li of (labItems || [])) {
        // Try per-test rate from service_master by test name
        const { data: testRate } = await supabase
          .from('service_master')
          .select('fee')
          .eq('hospital_id', hospitalId!)
          .ilike('name', `%${(li as any).lab_test_master?.test_name || ''}%`)
          .eq('item_type', 'lab_test')
          .maybeSingle();
        const finalRate = testRate?.fee ? Number(testRate.fee) : labRate.fee;
        const labGstPct = labRate.gstPct;
        const labGst = calcGST(finalRate, labGstPct);
        items.push({
          hospital_id: hospitalId, bill_id: billId,
          item_type: "lab", description: `Lab: ${(li as any).lab_test_master?.test_name || "Test"}`,
          quantity: 1, unit_rate: finalRate, taxable_amount: finalRate,
          gst_percent: labGstPct, gst_amount: labGst,
          total_amount: finalRate + labGst,
          hsn_code: labRate.hsn || "998931", source_module: "lab",
        });
      }
    }

    // Radiology charges
    const { data: radOrders } = await supabase
      .from("radiology_orders")
      .select("study_name, accession_number")
      .eq("hospital_id", hospitalId)
      .eq("admission_id", admissionId);

    const radRate = await getServiceRate('radiology', 500);

    for (const ro of (radOrders || [])) {
      const { data: studyRate } = await supabase
        .from('service_master')
        .select('fee, gst_percent, gst_applicable')
        .eq('hospital_id', hospitalId!)
        .ilike('name', `%${(ro as any).study_name || ''}%`)
        .maybeSingle();
      const radFee = studyRate?.fee ? Number(studyRate.fee) : radRate.fee;
      const radGstPct = studyRate?.gst_applicable ? (Number(studyRate.gst_percent) || 0) : radRate.gstPct;
      const radGst = calcGST(radFee, radGstPct);
      items.push({
        hospital_id: hospitalId, bill_id: billId,
        item_type: "radiology", description: `Radiology: ${(ro as any).study_name}`,
        quantity: 1, unit_rate: radFee, taxable_amount: radFee,
        gst_percent: radGstPct, gst_amount: radGst,
        total_amount: radFee + radGst,
        hsn_code: "998921", source_module: "radiology",
      });
    }

    // Pharmacy IP dispenses
    const { data: pharma } = await supabase
      .from("pharmacy_dispensing")
      .select("*, pharmacy_dispensing_items(*)")
      .eq("hospital_id", hospitalId)
      .eq("admission_id", admissionId)
      .eq("dispensing_type", "ip");

    (pharma || []).forEach((pd: any) => {
      ((pd as any).pharmacy_dispensing_items || []).forEach((item: any) => {
        const total = Number(item.unit_price) * Number(item.quantity_dispensed);
        items.push({
          hospital_id: hospitalId, bill_id: billId,
          item_type: "pharmacy", description: `Pharmacy: ${item.drug_name}`,
          quantity: Number(item.quantity_dispensed), unit_rate: Number(item.unit_price),
          taxable_amount: total, gst_percent: 12, gst_amount: total * 0.12,
          total_amount: total * 1.12, source_module: "pharmacy",
        });
      });
    });

    // Nursing procedures
    const { data: nursingProcs } = await (supabase as any)
      .from("nursing_procedures")
      .select("*")
      .eq("hospital_id", hospitalId)
      .eq("admission_id", admissionId)
      .eq("billed", false);

    if (nursingProcs?.length) {
      const nursingRate = await getServiceRate('nursing_procedure', 150);
      for (const np of nursingProcs) {
        const { data: procRate } = await supabase
          .from('service_master')
          .select('fee, gst_percent, gst_applicable')
          .eq('hospital_id', hospitalId!)
          .ilike('name', `%${(np.procedure_name || '').split(' ').slice(0, 2).join('%')}%`)
          .eq('item_type', 'nursing_procedure')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        const fee = procRate?.fee ? Number(procRate.fee) : nursingRate.fee;
        const qty = Number(np.quantity) || 1;
        const total = fee * qty;
        const gstPct = procRate?.gst_applicable ? (Number(procRate.gst_percent) || 0) : nursingRate.gstPct;
        const gst = calcGST(total, gstPct);
        items.push({
          hospital_id: hospitalId, bill_id: billId,
          item_type: "nursing_procedure", description: `Nursing: ${np.procedure_name}`,
          quantity: qty, unit_rate: fee, taxable_amount: total,
          gst_percent: gstPct, gst_amount: gst,
          total_amount: total + gst, source_module: "nursing",
        });
        // Mark as billed
        await (supabase as any).from("nursing_procedures").update({
          billed: true, bill_id: billId,
        }).eq("id", np.id);
      }
    }

    // Room charges
    const { data: admission } = await supabase
      .from("admissions")
      .select("admitted_at, discharged_at, ward_id, wards(name, ward_type), beds(bed_number)")
      .eq("id", admissionId)
      .maybeSingle();

    if (admission) {
      const admitDate = new Date(admission.admitted_at || Date.now());
      const dischDate = admission.discharged_at ? new Date(admission.discharged_at) : new Date();
      const days = Math.max(1, Math.ceil((dischDate.getTime() - admitDate.getTime()) / 86400000));
      const wardName = (admission as any).wards?.name || "Ward";
      const wardType = (admission as any).wards?.ward_type || "general";
      const bedNum = (admission as any).beds?.bed_number || "";

      const { data: roomRate } = await supabase
        .from('service_master')
        .select('fee, gst_percent, gst_applicable')
        .eq('hospital_id', hospitalId!)
        .ilike('name', `%${wardType}%`)
        .ilike('item_type', '%room%')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const ratePerDay = roomRate?.fee ? Number(roomRate.fee) : 500;
      const roomGstPct = roomRate?.gst_applicable ? (Number(roomRate.gst_percent) || 0) : 0;
      const roomTotal = ratePerDay * days;
      const roomGst = calcGST(roomTotal, roomGstPct);

      items.push({
        hospital_id: hospitalId, bill_id: billId,
        item_type: "room_charge", description: `Room: ${wardName} - Bed ${bedNum} (${days} days)`,
        quantity: days, unit_rate: ratePerDay, taxable_amount: roomTotal,
        gst_percent: roomGstPct, gst_amount: roomGst,
        total_amount: roomTotal + roomGst,
        hsn_code: "999272", source_module: "ipd",
      });
    }

    if (items.length > 0) {
      await supabase.from("bill_line_items").insert(items);
      const result = await recalculateBillTotalsSafe(billId);
      if (!result.ok) {
        console.error("Discharge bill recalculation failed:", result.error);
        toast({ title: "Charge totals need refresh", description: result.error || "Bill totals could not be updated", variant: "destructive" });
      }
    }
  };

  const fetchBills = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);

    let dateStart: string;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    switch (dateFilter) {
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        dateStart = y.toISOString().slice(0, 10);
        break;
      }
      case "week": {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        dateStart = w.toISOString().slice(0, 10);
        break;
      }
      case "month": {
        const m = new Date(now);
        m.setMonth(m.getMonth() - 1);
        dateStart = m.toISOString().slice(0, 10);
        break;
      }
      default:
        dateStart = todayStr;
    }

    let query = supabase
      .from("bills")
      .select("*, patients!inner(full_name, uhid)")
      .eq("hospital_id", hospitalId)
      .gte("bill_date", dateStart)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("payment_status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
    } else {
      setBills(
        (data || []).map((b: any) => ({
          id: b.id,
          bill_number: b.bill_number,
          patient_id: b.patient_id,
          patient_name: b.patients?.full_name || "Unknown",
          uhid: b.patients?.uhid || "",
          encounter_id: b.encounter_id,
          admission_id: b.admission_id,
          bill_type: b.bill_type,
          bill_date: b.bill_date,
          bill_status: b.bill_status,
          subtotal: Number(b.subtotal) || 0,
          discount_percent: Number(b.discount_percent) || 0,
          discount_amount: Number(b.discount_amount) || 0,
          gst_amount: Number(b.gst_amount) || 0,
          total_amount: Number(b.total_amount) || 0,
          advance_received: Number(b.advance_received) || 0,
          insurance_amount: Number(b.insurance_amount) || 0,
          patient_payable: Number(b.patient_payable) || 0,
          paid_amount: Number(b.paid_amount) || 0,
          balance_due: Number(b.balance_due) || 0,
          payment_status: b.payment_status,
          notes: b.notes,
          irn: b.irn || null,
          irn_generated_at: b.irn_generated_at || null,
          created_at: b.created_at,
        }))
      );
    }
    setLoading(false);
  }, [hospitalId, statusFilter, dateFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const selectedBill = bills.find((b) => b.id === selectedBillId) || null;

  const todayCollection = bills
    .filter((b) => b.paid_amount > 0)
    .reduce((s, b) => s + b.paid_amount, 0);
  const pendingAmount = bills.reduce((s, b) => s + b.balance_due, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Tab bar */}
      <div className="h-10 flex-shrink-0 border-b border-border bg-background px-4 flex items-center gap-1">
        <button
          className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
            activeTab === "bills" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("bills")}
        >Bills</button>
        <button
          className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
            activeTab === "collections" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("collections")}
        >💳 Collections</button>
      </div>

      {activeTab === "bills" ? (
        <div className="flex flex-1 overflow-hidden">
          <BillQueue
            bills={bills}
            loading={loading}
            selectedBillId={selectedBillId}
            onSelectBill={setSelectedBillId}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilter={setDateFilter}
            onNewBill={() => setShowNewBill(true)}
            onAdvanceReceipt={() => setShowAdvance(true)}
            todayCollection={todayCollection}
            pendingAmount={pendingAmount}
            billCount={bills.length}
          />
          <BillEditor
            bill={selectedBill}
            hospitalId={hospitalId}
            onRefresh={fetchBills}
          />
        </div>
      ) : (
        hospitalId && <CollectionsTab hospitalId={hospitalId} />
      )}

      {showNewBill && hospitalId && (
        <NewBillModal
          hospitalId={hospitalId}
          onClose={() => setShowNewBill(false)}
          onCreated={(id) => {
            setShowNewBill(false);
            fetchBills().then(() => setSelectedBillId(id));
          }}
        />
      )}
      {showAdvance && hospitalId && (
        <AdvanceReceiptModal
          hospitalId={hospitalId}
          onClose={() => setShowAdvance(false)}
          onCreated={() => {
            setShowAdvance(false);
            toast({ title: "Advance receipt created" });
          }}
        />
      )}
    </div>
  );
};

export default BillingPage;
