import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, Search, CheckCircle2, ArrowLeft, CreditCard, Printer, UserPlus } from "lucide-react";
import { autoPostJournalEntry } from "@/lib/accounting";
import AddReferralDoctorModal from "@/components/shared/AddReferralDoctorModal";

interface Props {
  hospitalId: string;
  onClose: () => void;
  onCreated: () => void;
  defaultDeptId?: string;
}

interface FoundPatient {
  id: string;
  full_name: string;
  uhid: string;
  phone: string | null;
}

const genders = ["male", "female", "other"] as const;
const priorities = ["normal", "urgent", "elderly", "pregnant", "disabled"] as const;

const priorityLabels: Record<string, { label: string; active: string }> = {
  normal: { label: "Normal", active: "bg-slate-700 text-white" },
  urgent: { label: "Urgent", active: "bg-red-600 text-white" },
  elderly: { label: "Elderly", active: "bg-amber-600 text-white" },
  pregnant: { label: "Pregnant", active: "bg-pink-600 text-white" },
  disabled: { label: "Disabled", active: "bg-violet-600 text-white" },
};

const PAYMENT_MODES = [
  { value: "cash", label: "💵 Cash" },
  { value: "upi", label: "📱 UPI" },
  { value: "card", label: "💳 Card" },
];

const DEFAULT_CONSULTATION_FEE = 500;

const WalkInModal: React.FC<Props> = ({ hospitalId, onClose, onCreated }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "payment" | "receipt">("details");
  const receiptRef = useRef<HTMLDivElement>(null);
  // Search
  const [phone, setPhone] = useState("");
  const [foundPatient, setFoundPatient] = useState<FoundPatient | null>(null);
  const [searching, setSearching] = useState(false);
  const [useExisting, setUseExisting] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundPatient[]>([]);

  // New patient fields
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string>("male");
  const [showOptional, setShowOptional] = useState(false);
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");

  // Token fields
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; full_name: string; department_id: string | null }[]>([]);
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [nextToken, setNextToken] = useState("A-1");
  const [submitting, setSubmitting] = useState(false);
  const [referralSource, setReferralSource] = useState("");
  const [referralDoctorId, setReferralDoctorId] = useState<string | null>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Payment fields
  const [consultationFee, setConsultationFee] = useState(DEFAULT_CONSULTATION_FEE);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [receiptData, setReceiptData] = useState<{
    billNumber: string;
    patientName: string;
    uhid: string;
    department: string;
    doctor: string;
    token: string;
    fee: number;
    paymentMode: string;
    date: string;
    paid: boolean;
  } | null>(null);

  // Fetch departments + doctors
  useEffect(() => {
    supabase.from("departments").select("id, name").eq("hospital_id", hospitalId).eq("is_active", true)
      .then(({ data }) => setDepartments(data || []));
    supabase.from("users").select("id, full_name, department_id").eq("hospital_id", hospitalId).eq("role", "doctor").eq("is_active", true)
      .then(({ data }) => setDoctors(data || []));
  }, [hospitalId]);

  // Fetch next token number
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("opd_tokens")
      .select("token_number")
      .eq("hospital_id", hospitalId)
      .eq("visit_date", today)
      .eq("token_prefix", "A")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const last = parseInt(data[0].token_number.split("-")[1] || "0");
          setNextToken(`A-${last + 1}`);
        } else {
          setNextToken("A-1");
        }
      });
  }, [hospitalId]);

  // Fetch consultation fee from service_master
  useEffect(() => {
    supabase
      .from("service_master")
      .select("fee")
      .eq("hospital_id", hospitalId)
      .ilike("name", "%consultation%")
      .eq("is_active", true)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].fee) {
          setConsultationFee(data[0].fee);
        }
      });
  }, [hospitalId]);

  // Phone/name/UHID search
  const searchPatient = useCallback(async (val: string) => {
    if (val.length < 3) { setFoundPatient(null); setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, uhid, phone")
      .eq("hospital_id", hospitalId)
      .or(`phone.ilike.%${val}%,full_name.ilike.%${val}%,uhid.ilike.%${val}%`)
      .limit(5);
    const results = data || [];
    setSearchResults(results);
    setFoundPatient(results.length === 1 ? results[0] : null);
    setSearching(false);
  }, [hospitalId]);

  useEffect(() => {
    const timer = setTimeout(() => searchPatient(phone), 300);
    return () => clearTimeout(timer);
  }, [phone, searchPatient]);

  const filteredDoctors = deptId ? doctors.filter((d) => d.department_id === deptId) : doctors;
  const selectedDeptName = departments.find(d => d.id === deptId)?.name || "—";
  const selectedDoctorName = doctors.find(d => d.id === doctorId)?.full_name || "—";
  const patientDisplayName = useExisting ? foundPatient?.full_name || "" : fullName;

  const handleProceedToPayment = () => {
    if (!useExisting && !fullName.trim()) {
      toast({ title: "Patient name is required", variant: "destructive" });
      return;
    }
    setStep("payment");
  };

  const createPatient = async (): Promise<string> => {
    if (useExisting && foundPatient) return foundPatient.id;

    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const { count } = await supabase.from("patients").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId);
    const seq = String((count || 0) + 1).padStart(4, "0");
    const uhid = `UHID-${dateStr}-${seq}`;

    const patientData: {
      hospital_id: string;
      full_name: string;
      uhid: string;
      phone: string | null;
      gender: "male" | "female" | "other";
      dob?: string;
      blood_group?: string;
      address?: string;
    } = {
      hospital_id: hospitalId,
      full_name: fullName.trim(),
      uhid,
      phone: phone || null,
      gender: gender as "male" | "female" | "other",
    };
    if (age) {
      const y = new Date().getFullYear() - parseInt(age);
      patientData.dob = `${y}-01-01`;
    }
    if (dob) patientData.dob = dob;
    if (bloodGroup) patientData.blood_group = bloodGroup;
    if (address) patientData.address = address;
    if (referralSource) (patientData as any).referral_source = referralSource;

    const { data: newPatient, error } = await supabase.from("patients").insert([patientData]).select("id").single();
    if (error) throw error;
    return newPatient.id;
  };

  const handlePayAndIssue = async (skipPayment = false) => {
    setSubmitting(true);
    try {
      const patientId = await createPatient();

      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from("users").select("id").eq("auth_user_id", user?.id || "").maybeSingle();
      const userId = userData?.id || null;

      const today = new Date().toISOString().split("T")[0];

      // Generate bill number
      const { count: billCount } = await supabase.from("bills").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId);
      const billNumber = `OPD-${today.replace(/-/g, "")}-${String((billCount || 0) + 1).padStart(4, "0")}`;

      const fee = consultationFee;
      const isPaid = !skipPayment && fee > 0;

      // Create bill
      const { data: bill, error: billErr } = await supabase.from("bills").insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        bill_number: billNumber,
        bill_type: "opd",
        bill_date: today,
        subtotal: fee,
        total_amount: fee,
        patient_payable: fee,
        paid_amount: isPaid ? fee : 0,
        balance_due: isPaid ? 0 : fee,
        payment_status: isPaid ? "paid" : "unpaid",
        bill_status: "final",
        created_by: userId,
      }).select("id").single();
      if (billErr) throw billErr;

      // Insert line item
      await supabase.from("bill_line_items").insert({
        hospital_id: hospitalId,
        bill_id: bill.id,
        description: "Consultation Fee",
        item_type: "consultation",
        unit_rate: fee,
        quantity: 1,
        total_amount: fee,
      });

      // Insert payment if paid
      if (isPaid) {
        await supabase.from("bill_payments").insert({
          hospital_id: hospitalId,
          bill_id: bill.id,
          payment_mode: paymentMode,
          amount: fee,
          transaction_id: paymentRef || null,
          received_by: userId,
        });

        // Auto-post journal entry
        await autoPostJournalEntry({
          triggerEvent: `bill_payment_${paymentMode}`,
          sourceModule: "billing",
          sourceId: bill.id,
          amount: fee,
          description: `OPD Consultation - Bill ${billNumber} - ${paymentMode}`,
          hospitalId,
          postedBy: userId || "",
        });
      }

      // Revenue recognition journal entry
      await autoPostJournalEntry({
        triggerEvent: "bill_finalized_opd",
        sourceModule: "billing",
        sourceId: bill.id,
        amount: fee,
        description: `OPD Revenue - Bill ${billNumber}`,
        hospitalId,
        postedBy: userId || "",
      });

      // Insert token
      const { error: tokenErr } = await supabase.from("opd_tokens").insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        doctor_id: doctorId || null,
        department_id: deptId || null,
        token_number: nextToken,
        token_prefix: "A",
        visit_date: today,
        status: "waiting",
        priority,
      });
      if (tokenErr) throw tokenErr;

      // Sync referral to CRM: create patient_acquisition + increment referral_doctors counters
      if (referralDoctorId) {
        const today2 = new Date().toISOString().split("T")[0];
        await supabase.from("patient_acquisition").insert({
          hospital_id: hospitalId,
          patient_id: patientId,
          source: "referral_doctor",
          referral_doctor_id: referralDoctorId,
          first_visit_date: today2,
          first_visit_revenue: fee,
          is_new_patient: !useExisting,
        } as any);

        // Increment referral count and revenue on the referral doctor
        const { data: rd } = await supabase
          .from("referral_doctors")
          .select("total_referrals, total_revenue")
          .eq("id", referralDoctorId)
          .single();
        if (rd) {
          await supabase.from("referral_doctors").update({
            total_referrals: (rd.total_referrals || 0) + 1,
            total_revenue: (rd.total_revenue || 0) + fee,
            last_referral_at: new Date().toISOString(),
          }).eq("id", referralDoctorId);
        }
      }
      const rData = {
        billNumber,
        patientName: patientDisplayName || "—",
        uhid: useExisting ? foundPatient?.uhid || "" : "New",
        department: selectedDeptName,
        doctor: doctorId ? `Dr. ${selectedDoctorName}` : "—",
        token: nextToken,
        fee,
        paymentMode: isPaid ? paymentMode : "—",
        date: today,
        paid: isPaid,
      };
      setReceiptData(rData);
      setStep("receipt");

      const statusMsg = isPaid
        ? `Token ${nextToken} issued · ₹${fee.toLocaleString("en-IN")} collected ✓`
        : `Token ${nextToken} issued · Payment pending`;
      toast({ title: statusMsg });
    } catch (err: unknown) {
      toast({ title: "Registration failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    const printWin = window.open("", "_blank", "width=400,height=600");
    if (!printWin) return;
    const paidLabel = receiptData.paid ? "Paid (" + receiptData.paymentMode + ")" : "Pending";
    const paidClass = receiptData.paid ? "paid" : "pending";
    const html = [
      "<html><head><title>OPD Receipt</title>",
      "<style>",
      "body{font-family:Arial,sans-serif;padding:20px;margin:0;font-size:13px}",
      ".r{display:flex;justify-content:space-between;margin-bottom:6px}",
      ".l{color:#64748b}.v{font-weight:600;color:#1e293b}",
      ".m{font-family:monospace}.c{text-align:center}",
      ".db{border-bottom:1px dashed #cbd5e1;padding-bottom:10px;margin-bottom:10px}",
      ".dt{border-top:1px dashed #cbd5e1;padding-top:10px;margin-top:10px}",
      ".tk{font-size:22px;font-weight:800;color:#1A2F5A}",
      ".f{font-weight:700}",
      ".paid{color:#059669;font-weight:600}",
      ".pending{color:#d97706;font-weight:600}",
      ".ft{font-size:10px;color:#94a3b8;text-align:center;margin-top:12px}",
      "@media print{body{padding:10px}}",
      "</style></head><body>",
      '<div class="c db"><strong>OPD CONSULTATION RECEIPT</strong><br/><small>' + receiptData.date + "</small></div>",
      '<div class="r"><span class="l">Bill No.</span><span class="v m">' + receiptData.billNumber + "</span></div>",
      '<div class="r"><span class="l">Patient</span><span class="v">' + receiptData.patientName + "</span></div>",
      '<div class="r"><span class="l">UHID</span><span class="v m">' + receiptData.uhid + "</span></div>",
      '<div class="r"><span class="l">Department</span><span class="v">' + receiptData.department + "</span></div>",
      '<div class="r"><span class="l">Doctor</span><span class="v">' + receiptData.doctor + "</span></div>",
      '<div class="dt">',
      '<div class="r"><span class="l">Token</span><span class="tk">' + receiptData.token + "</span></div>",
      '<div class="r"><span class="l">Consultation Fee</span><span class="f">\u20B9' + receiptData.fee.toLocaleString("en-IN") + "</span></div>",
      '<div class="r"><span class="l">Payment</span><span class="' + paidClass + '">' + paidLabel + "</span></div>",
      "</div>",
      '<div class="ft dt">Thank you for visiting. Get well soon!</div>',
      "</body></html>",
    ].join("");
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-[440px] shadow-xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>

        {step === "details" ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">Quick Registration</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">Register patient in under 30 seconds</p>

            {/* Search */}
            <div className="mt-5">
              <label className="text-xs font-medium text-slate-600">Search Patient (Name, Phone, or UHID)</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setUseExisting(false); setFoundPatient(null); }}
                  placeholder="Search by name, phone, or UHID..."
                  className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1A2F5A] focus:ring-2 focus:ring-[#1A2F5A]/10 outline-none"
                />
              </div>
              {searchResults.length > 0 && !useExisting && (
                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                  {searchResults.map((p) => (
                    <button key={p.id} onClick={() => { setFoundPatient(p); setUseExisting(true); setSearchResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 last:border-0 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.full_name}</p>
                        <p className="text-[11px] text-slate-500">{p.uhid} · {p.phone || "No phone"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {useExisting && foundPatient && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Patient selected</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{foundPatient.full_name} · {foundPatient.uhid}</p>
                  <button onClick={() => { setUseExisting(false); setFoundPatient(null); }} className="mt-1 text-[11px] text-slate-500 hover:underline">Change</button>
                </div>
              )}
            </div>

            {/* New patient fields */}
            {!useExisting && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Full Name *</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mt-1 focus:border-[#1A2F5A] focus:ring-2 focus:ring-[#1A2F5A]/10 outline-none" placeholder="Patient full name" />
                </div>
                <div className="flex gap-3">
                  <div className="w-24">
                    <label className="text-xs font-medium text-slate-600">Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={0} max={120} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mt-1 focus:border-[#1A2F5A] focus:ring-2 focus:ring-[#1A2F5A]/10 outline-none" placeholder="Age" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600">Gender</label>
                    <div className="flex gap-1.5 mt-1">
                      {genders.map((g) => (
                        <button key={g} onClick={() => setGender(g)}
                          className={cn("flex-1 h-10 rounded-lg text-xs font-medium capitalize transition-colors",
                            gender === g ? "bg-[#1A2F5A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!showOptional && (
                    <button onClick={() => setShowOptional(true)} className="text-xs text-[#1A2F5A] font-medium hover:underline">
                      + Add more details (optional)
                    </button>
                  )}
                  <a href="/patients?register=true" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-[#1A2F5A] hover:underline">
                    Need full registration? →
                  </a>
                </div>
                {showOptional && (
                  <div className="space-y-3 pt-1">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-600">DOB</label>
                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mt-1 outline-none" />
                      </div>
                      <div className="w-28">
                        <label className="text-xs font-medium text-slate-600">Blood Group</label>
                        <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full h-10 px-2 border border-slate-200 rounded-lg text-sm mt-1 outline-none">
                          <option value="">—</option>
                          {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Address</label>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mt-1 outline-none" placeholder="Address (optional)" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Department + Doctor */}
            <div className="flex gap-3 mt-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600">Department</label>
                <select value={deptId} onChange={(e) => { setDeptId(e.target.value); setDoctorId(""); }} className="w-full h-10 px-2 border border-slate-200 rounded-lg text-sm mt-1 outline-none">
                  <option value="">Select...</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {departments.length === 0 && (
                  <a href="/settings/departments" className="text-[10px] text-amber-600 hover:underline mt-0.5 block">No departments — add in Settings →</a>
                )}
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600">Doctor</label>
                <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-full h-10 px-2 border border-slate-200 rounded-lg text-sm mt-1 outline-none">
                  <option value="">Select...</option>
                  {filteredDoctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
                </select>
                {doctors.length === 0 && (
                  <a href="/settings/staff" className="text-[10px] text-amber-600 hover:underline mt-0.5 block">No doctors — add in Settings →</a>
                )}
              </div>
            </div>

            {/* Referral */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">Referral</label>
                <button
                  onClick={() => setShowReferralModal(true)}
                  className="text-xs text-[#0E7B7B] font-medium hover:underline flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  + Referral
                </button>
              </div>
              {referralSource && (
                <div className="mt-1 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800 flex items-center justify-between">
                  <span>Referred by: <strong>{referralSource}</strong></span>
                  <button onClick={() => { setReferralSource(""); setReferralDoctorId(null); }} className="text-teal-500 hover:text-teal-700 ml-2">✕</button>
                </div>
              )}
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">Priority</label>
              <div className="flex gap-1.5 mt-1">
                {priorities.map((p) => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={cn("flex-1 h-8 rounded-lg text-[11px] font-medium capitalize transition-colors",
                      priority === p ? priorityLabels[p].active : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}>
                    {priorityLabels[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Token preview */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <span className="text-xs text-slate-500">Token </span>
              <span className="text-lg font-bold text-[#1A2F5A]">{nextToken}</span>
              <span className="text-xs text-slate-500"> will be assigned</span>
            </div>

            {/* Proceed to Payment */}
            <button
              onClick={handleProceedToPayment}
              className="w-full h-11 mt-4 bg-[#1A2F5A] text-white rounded-lg text-[13px] font-semibold hover:bg-[#152647] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Proceed to Payment →
            </button>
          </>
        ) : step === "payment" ? (
          /* ══════════ STEP 2: PAYMENT ══════════ */
          <>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#0E7B7B]" />
              Collect Consultation Fee
            </h2>
            <p className="text-[13px] text-slate-500 mt-0.5">Pay before token issuance</p>

            {/* Patient summary */}
            <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Patient</span>
                <span className="font-medium text-slate-800">{patientDisplayName || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-800">{selectedDeptName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Doctor</span>
                <span className="font-medium text-slate-800">{doctorId ? `Dr. ${selectedDoctorName}` : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Token</span>
                <span className="font-bold text-[#1A2F5A]">{nextToken}</span>
              </div>
            </div>

            {/* Consultation Fee */}
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">Consultation Fee (₹)</label>
              <input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(Number(e.target.value) || 0)}
                min={0}
                className="w-full h-12 px-4 border border-slate-200 rounded-lg text-lg font-bold mt-1 focus:border-[#0E7B7B] focus:ring-2 focus:ring-[#0E7B7B]/10 outline-none"
              />
            </div>

            {/* Payment Mode */}
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">Payment Mode</label>
              <div className="flex gap-2 mt-1.5">
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMode(m.value)}
                    className={cn(
                      "flex-1 h-11 rounded-lg text-sm font-medium transition-colors",
                      paymentMode === m.value
                        ? "bg-[#0E7B7B] text-white shadow-md"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference for UPI/Card */}
            {paymentMode !== "cash" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-600">Reference / Txn ID</label>
                <input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Transaction reference..."
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mt-1 focus:border-[#0E7B7B] focus:ring-2 focus:ring-[#0E7B7B]/10 outline-none"
                />
              </div>
            )}

            {/* Pay & Issue Token */}
            <button
              onClick={() => handlePayAndIssue(false)}
              disabled={submitting || consultationFee <= 0}
              className="w-full h-12 mt-5 bg-[#0E7B7B] text-white rounded-lg text-[14px] font-bold hover:bg-[#0a6565] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? "Processing..." : `💳 Pay ₹${consultationFee.toLocaleString("en-IN")} & Issue Token →`}
            </button>

            {/* Skip / Back */}
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setStep("details")}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back to details
              </button>
              <button
                onClick={() => handlePayAndIssue(true)}
                disabled={submitting}
                className="text-xs text-amber-600 font-medium hover:underline"
              >
                Skip — Pay Later →
              </button>
            </div>
          </>
        ) : (
          /* ══════════ STEP 3: RECEIPT ══════════ */
          <>
            <h2 className="text-lg font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Token Issued Successfully
            </h2>

            {/* Printable Receipt */}
            <div ref={receiptRef} className="mt-4 border border-slate-200 rounded-lg p-5 bg-white" id="opd-receipt">
              <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                <p className="text-sm font-bold text-slate-800">OPD CONSULTATION RECEIPT</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{receiptData?.date}</p>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill No.</span>
                  <span className="font-mono font-medium text-slate-800">{receiptData?.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient</span>
                  <span className="font-medium text-slate-800">{receiptData?.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UHID</span>
                  <span className="font-mono text-slate-800">{receiptData?.uhid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department</span>
                  <span className="text-slate-800">{receiptData?.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor</span>
                  <span className="text-slate-800">{receiptData?.doctor}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Token</span>
                  <span className="text-lg font-bold text-[#1A2F5A]">{receiptData?.token}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Consultation Fee</span>
                  <span className="font-bold text-slate-800">₹{receiptData?.fee?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment</span>
                  <span className={cn("font-medium", receiptData?.paid ? "text-emerald-600" : "text-amber-600")}>
                    {receiptData?.paid ? `Paid (${receiptData.paymentMode})` : "Pending"}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 mt-3 pt-2 text-center">
                <p className="text-[10px] text-slate-400">Thank you for visiting. Get well soon!</p>
              </div>
            </div>

            {/* Print + Done buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 h-11 bg-[#1A2F5A] text-white rounded-lg text-[13px] font-semibold hover:bg-[#152647] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
              <button
                onClick={() => { onCreated(); onClose(); }}
                className="flex-1 h-11 bg-slate-100 text-slate-700 rounded-lg text-[13px] font-semibold hover:bg-slate-200 active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <AddReferralDoctorModal
          open={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          onSaved={(name, id) => { setReferralSource(name); setReferralDoctorId(id || null); }}
          hospitalId={hospitalId}
        />
      </div>
    </div>
  );
};

export default WalkInModal;
