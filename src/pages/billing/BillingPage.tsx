import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BillQueue from "@/components/billing/BillQueue";
import BillEditor from "@/components/billing/BillEditor";
import NewBillModal from "@/components/billing/NewBillModal";
import AdvanceReceiptModal from "@/components/billing/AdvanceReceiptModal";

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
  created_at: string;
}

const BillingPage: React.FC = () => {
  const { toast } = useToast();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewBill, setShowNewBill] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");

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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
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
