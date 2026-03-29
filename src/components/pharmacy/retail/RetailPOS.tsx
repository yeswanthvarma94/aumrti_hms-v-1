import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RetailDrugSearch, { type DrugSearchResult } from "./RetailDrugSearch";
import RetailCart, { type CartItem } from "./RetailCart";
import RetailPayment from "./RetailPayment";
import { createPatientRecord, type PatientGender } from "@/lib/patient-records";

interface Props {
  hospitalId: string;
}

interface PatientSearchResult {
  id: string;
  full_name: string;
  uhid: string;
  phone: string | null;
}

const RetailPOS: React.FC<Props> = ({ hospitalId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerUhid, setCustomerUhid] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
  const [discountFixed, setDiscountFixed] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ full_name: "", phone: "", age: "", gender: "male" as PatientGender });

  // Search patients by name, phone, or UHID
  useEffect(() => {
    const query = customerPhone.trim() || customerName.trim();
    if (query.length < 2) {
      setSearchResults([]);
      if (!customerId) setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, full_name, uhid, phone")
          .eq("hospital_id", hospitalId)
          .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,uhid.ilike.%${query}%`)
          .order("created_at", { ascending: false })
          .limit(6);

        if (!error && data) {
          setSearchResults(data as PatientSearchResult[]);
          // Auto-link if exact phone match with single result
          if (data.length === 1 && customerPhone.length >= 10 && data[0].phone === customerPhone.trim()) {
            setCustomerId(data[0].id);
            setCustomerName(data[0].full_name);
            setCustomerUhid(data[0].uhid);
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [customerPhone, customerName, hospitalId, customerId]);

  const handleSelectPatient = useCallback((patient: PatientSearchResult) => {
    setCustomerId(patient.id);
    setCustomerName(patient.full_name);
    setCustomerPhone(patient.phone || "");
    setCustomerUhid(patient.uhid);
    setSearchResults([]);
    setShowNewPatientForm(false);
  }, []);

  const handleClearPatient = useCallback(() => {
    setCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerUhid("");
    setSearchResults([]);
  }, []);

  const handleCreateCustomer = useCallback(async () => {
    try {
      const { calculateDobFromAge } = await import("@/lib/patient-records");
      const patient = await createPatientRecord({
        hospitalId,
        fullName: newPatientData.full_name || "Walk-in Customer",
        phone: newPatientData.phone,
        dob: calculateDobFromAge(parseInt(newPatientData.age, 10) || undefined),
        gender: newPatientData.gender,
      });
      setCustomerId(patient.id);
      setCustomerName(patient.full_name);
      setCustomerPhone(patient.phone || "");
      setCustomerUhid(patient.uhid);
      setShowNewPatientForm(false);
      setNewPatientData({ full_name: "", phone: "", age: "", gender: "male" });
      toast({ title: `✓ Patient registered: ${patient.full_name} (${patient.uhid})` });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  }, [hospitalId, newPatientData, toast]);

  const handleAddToCart = useCallback((drug: DrugSearchResult) => {
    if (!drug.best_batch) {
      toast({ title: "No stock available", variant: "destructive" });
      return;
    }

    // Check if already in cart
    const existingIdx = items.findIndex(i => i.drug_id === drug.drug_id && i.batch_id === drug.best_batch!.id);
    if (existingIdx >= 0) {
      const updated = [...items];
      if (updated[existingIdx].qty < updated[existingIdx].max_qty) {
        updated[existingIdx].qty += 1;
        setItems(updated);
      }
      return;
    }

    // Schedule H warning
    if (drug.drug_schedule === "H" || drug.drug_schedule === "H1") {
      toast({
        title: `⚠️ ${drug.drug_schedule} Drug`,
        description: "This drug requires a prescription. Ensure customer has one.",
      });
    }

    // NDPS warning
    if (drug.is_ndps) {
      toast({
        title: "🔴 NDPS Drug",
        description: "Prescription mandatory. Record prescriber details.",
        variant: "destructive",
      });
    }

    const newItem: CartItem = {
      drug_id: drug.drug_id,
      drug_name: drug.drug_name,
      generic_name: drug.generic_name,
      batch_id: drug.best_batch.id,
      batch_number: drug.best_batch.batch_number,
      expiry_date: drug.best_batch.expiry_date,
      qty: 1,
      max_qty: drug.best_batch.quantity_available,
      unit_price: drug.best_batch.sale_price,
      mrp: drug.best_batch.mrp,
      gst_percent: drug.best_batch.gst_percent,
      is_ndps: drug.is_ndps,
      drug_schedule: drug.drug_schedule,
      is_expiring: drug.best_batch.is_expiring,
      item_discount: 0,
    };

    setItems(prev => [...prev, newItem]);
  }, [items, toast]);

  const handleUpdateQty = useCallback((idx: number, qty: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, qty } : item));
  }, []);

  const handleRemoveItem = useCallback((idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleClearAll = useCallback(() => {
    setItems([]);
    setDiscountPercent(0);
    setDiscountFixed(0);
  }, []);

  const handleSaleComplete = useCallback(() => {
    setItems([]);
    setCustomerId(null);
    setCustomerPhone("");
    setCustomerName("");
    setDiscountPercent(0);
    setDiscountFixed(0);
    setDiscountMode("percent");
  }, []);

  const customerStatusLabel = customerId
    ? `${customerName || "Patient found"}`
    : customerPhone.length >= 10
      ? "New walk-in customer"
      : "Enter phone to fetch from database or type a new customer name";

  // Calculations
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const discountAmount = discountMode === "percent"
    ? subtotal * (discountPercent / 100)
    : Math.min(discountFixed, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = items.reduce((s, i) => {
    const itemTotal = i.unit_price * i.qty;
    const ratio = afterDiscount > 0 ? (itemTotal / subtotal) : 0;
    const discounted = itemTotal - (discountAmount * ratio);
    return s + discounted * (i.gst_percent / (100 + i.gst_percent));
  }, 0);
  const netTotal = afterDiscount;

  return (
    <div className="h-full flex flex-row overflow-hidden">
      <RetailDrugSearch hospitalId={hospitalId} onAddToCart={handleAddToCart} />
      <RetailCart
        items={items}
        customerId={customerId}
        customerPhone={customerPhone}
        customerName={customerName}
        customerStatusLabel={customerStatusLabel}
        discountPercent={discountPercent}
        discountMode={discountMode}
        discountFixed={discountFixed}
        searching={searching}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearAll={handleClearAll}
        onSetCustomerPhone={setCustomerPhone}
        onSetCustomerName={handleCustomerNameChange}
        onSetDiscountPercent={setDiscountPercent}
        onSetDiscountMode={setDiscountMode}
        onSetDiscountFixed={setDiscountFixed}
        onCreateCustomer={handleCreateCustomer}
        subtotal={subtotal}
        discountAmount={discountAmount}
        gstAmount={gstAmount}
        netTotal={netTotal}
      />
      <RetailPayment
        hospitalId={hospitalId}
        items={items}
        customerId={customerId}
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        gstAmount={gstAmount}
        netTotal={netTotal}
        customerPhone={customerPhone}
        customerName={customerName}
        onSaleComplete={handleSaleComplete}
      />
    </div>
  );
};

export default RetailPOS;
