import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_OPERATIONAL } from "@/hooks/queries/staleTimes";
import { cn } from "@/lib/utils";
import { autoPullAdmissionCharges as autoPullAdmissionChargesUtil } from "@/lib/ipdBilling";
import { autoPostJournalEntry } from "@/lib/accounting";

import BillQueue from "@/components/billing/BillQueue";
import BillEditor from "@/components/billing/BillEditor";
import NewBillModal from "@/components/billing/NewBillModal";
import AdvanceReceiptModal from "@/components/billing/AdvanceReceiptModal";
import CollectionsTab from "@/components/billing/tabs/CollectionsTab";
import PendingOPDTab from "@/components/billing/tabs/PendingOPDTab";

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
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hospitalId } = useHospitalId();
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [showNewBill, setShowNewBill] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [dischargeBillCreated, setDischargeBillCreated] = useState(false);
  const [activeTab, setActiveTab] = useState("bills");
  const [editorInitialTab, setEditorInitialTab] = useState<"items" | "payments" | "insurance">("items");
  const [hospitalName, setHospitalName] = useState<string>("");

  useEffect(() => {
    if (!hospitalId) return;
    supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle()
      .then(({ data }) => setHospitalName(data?.name || ""));
  }, [hospitalId]);

  const billsQueryKey = ["billing-bills", hospitalId, statusFilter, dateFilter];

  const { data: bills = [], isLoading: loading, refetch } = useQuery({
    queryKey: billsQueryKey,
    enabled: !!hospitalId,
    staleTime: STALE_OPERATIONAL,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let dateStart: string;
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      switch (dateFilter) {
        case "yesterday": {
          const y = new Date(now); y.setDate(y.getDate() - 1);
          dateStart = y.toISOString().slice(0, 10); break;
        }
        case "week": {
          const w = new Date(now); w.setDate(w.getDate() - 7);
          dateStart = w.toISOString().slice(0, 10); break;
        }
        case "month": {
          const m = new Date(now); m.setMonth(m.getMonth() - 1);
          dateStart = m.toISOString().slice(0, 10); break;
        }
        default:
          dateStart = todayStr;
      }

      let query = supabase
        .from("bills")
        .select("id, bill_number, patient_id, encounter_id, admission_id, bill_type, bill_date, bill_status, subtotal, discount_percent, discount_amount, gst_amount, total_amount, advance_received, insurance_amount, patient_payable, paid_amount, balance_due, payment_status, notes, irn, irn_generated_at, created_at, patients!inner(full_name, uhid)")
        .eq("hospital_id", hospitalId as string)
        .gte("bill_date", dateStart)
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("payment_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
        throw error;
      }

      const realBills: BillRecord[] = (data || []).map((b: any) => ({
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
      }));

      // Find active admissions WITHOUT an IPD bill — surface as virtual "Pending IPD" rows
      let virtualBills: BillRecord[] = [];
      if (statusFilter === "all" || statusFilter === "unpaid") {
        const { data: activeAdms } = await supabase
          .from("admissions")
          .select("id, admitted_at, admission_number, patient_id, patients!inner(full_name, uhid)")
          .eq("hospital_id", hospitalId as string)
          .eq("status", "active");

        const admissionsWithBills = new Set(
          realBills.filter((b) => b.bill_type === "ipd" && b.admission_id).map((b) => b.admission_id)
        );
        const { data: existingIpd } = await supabase
          .from("bills")
          .select("admission_id")
          .eq("hospital_id", hospitalId as string)
          .eq("bill_type", "ipd")
          .not("admission_id", "is", null);
        (existingIpd || []).forEach((b: any) => admissionsWithBills.add(b.admission_id));

        virtualBills = (activeAdms || [])
          .filter((a: any) => !admissionsWithBills.has(a.id))
          .map((a: any) => ({
            id: `pending:${a.id}`,
            bill_number: `IPD-${a.admission_number || a.id.slice(0, 8)}`,
            patient_id: a.patient_id,
            patient_name: a.patients?.full_name || "Unknown",
            uhid: a.patients?.uhid || "",
            encounter_id: null,
            admission_id: a.id,
            bill_type: "ipd",
            bill_date: (a.admitted_at || new Date().toISOString()).slice(0, 10),
            bill_status: "pending_ipd",
            subtotal: 0,
            discount_percent: 0,
            discount_amount: 0,
            gst_amount: 0,
            total_amount: 0,
            advance_received: 0,
            insurance_amount: 0,
            patient_payable: 0,
            paid_amount: 0,
            balance_due: 0,
            payment_status: "unpaid",
            notes: null,
            irn: null,
            irn_generated_at: null,
            created_at: a.admitted_at || new Date().toISOString(),
          }));
      }

      return [...virtualBills, ...realBills];
    },
  });

  const fetchBills = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["billing-bills", hospitalId] });
  }, [queryClient, hospitalId]);

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

  const autoPullAdmissionCharges = async (billId: string, admissionId: string) => {
    if (!hospitalId) return;
    const result = await autoPullAdmissionChargesUtil(billId, admissionId, hospitalId);
    if (!result.ok) {
      toast({
        title: "Failed to pull some admission charges",
        description: result.error || "Bill totals could not be updated",
        variant: "destructive",
      });
      return;
    }
    if (result.usedFallbackRate) {
      toast({
        title: "Using fallback rates",
        description: "Some service rates are not configured. Set them in Settings → Service Rates.",
      });
    }
  };

  const createDischargeBill = async (admissionId: string) => {
    if (!hospitalId) return;
    setDischargeBillCreated(true);

    const { data: existing } = await supabase
      .from("bills")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("admission_id", admissionId)
      .eq("bill_type", "ipd")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      await autoPullAdmissionCharges(existing[0].id, admissionId);
      await fetchBills();
      setSelectedBillId(existing[0].id);
      setSearchParams({});
      return;
    }

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

    await autoPullAdmissionCharges(newBill.id, admissionId);

    // Audit-rule: post journal entry after IPD discharge bill creation.
    // Read the post-pull total so the entry reflects real charges.
    try {
      const { data: pulled } = await supabase
        .from("bills")
        .select("total_amount, bill_number")
        .eq("id", newBill.id)
        .maybeSingle();
      const amount = Number(pulled?.total_amount) || 0;
      if (amount > 0) {
        await autoPostJournalEntry({
          triggerEvent: "bill_finalized_ipd",
          sourceModule: "ipd",
          sourceId: newBill.id,
          amount,
          description: `IPD Revenue - Bill ${pulled?.bill_number || billNumber}`,
          hospitalId,
          postedBy: userData?.id || "",
        });
      }
    } catch (jeErr) {
      console.error("Journal posting failed for IPD discharge bill:", jeErr);
      toast({ title: "Discharge bill created. Accounting sync pending — please verify.", variant: "destructive" });
    }

    toast({ title: `IPD Discharge Bill #${billNumber} created with auto-pulled charges` });
    await fetchBills();
    setSelectedBillId(newBill.id);
    setSearchParams({});
  };

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
            activeTab === "pending-opd" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("pending-opd")}
        >🩺 Pending OPD</button>
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
            onSelectBill={(id) => {
              if (id.startsWith("pending:")) {
                const admissionId = id.slice("pending:".length);
                setDischargeBillCreated(false);
                createDischargeBill(admissionId);
              } else {
                setSelectedBillId(id);
                setEditorInitialTab("items");
              }
            }}
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
            initialTab={editorInitialTab}
          />
        </div>
      ) : activeTab === "pending-opd" ? (
        hospitalId && (
          <PendingOPDTab
            hospitalId={hospitalId}
            hospitalName={hospitalName}
            onCollectNow={(billId) => {
              setEditorInitialTab("payments");
              setSelectedBillId(billId);
              setActiveTab("bills");
              // Make sure the bill is loaded into the queue (it may be outside current date filter)
              fetchBills();
            }}
          />
        )
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
