import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, Search, CheckCircle2 } from "lucide-react";

interface Props {
  hospitalId: string;
  onClose: () => void;
  onCreated: () => void;
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

const WalkInModal: React.FC<Props> = ({ hospitalId, onClose, onCreated }) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [foundPatient, setFoundPatient] = useState<FoundPatient | null>(null);
  const [searching, setSearching] = useState(false);
  const [useExisting, setUseExisting] = useState(false);

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

  // Phone/name/UHID search
  const [searchResults, setSearchResults] = useState<FoundPatient[]>([]);
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

  const handleSubmit = async () => {
    if (!useExisting && !fullName.trim()) {
      toast({ title: "Patient name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let patientId: string;

      if (useExisting && foundPatient) {
        patientId = foundPatient.id;
      } else {
        // Generate UHID
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

        const { data: newPatient, error } = await supabase.from("patients").insert([patientData]).select("id").single();
        if (error) throw error;
        patientId = newPatient.id;
      }

      // Insert token
      const { error: tokenErr } = await supabase.from("opd_tokens").insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        doctor_id: doctorId || null,
        department_id: deptId || null,
        token_number: nextToken,
        token_prefix: "A",
        visit_date: new Date().toISOString().split("T")[0],
        status: "waiting",
        priority,
      });
      if (tokenErr) throw tokenErr;

      toast({ title: `Token ${nextToken} issued for ${useExisting ? foundPatient?.full_name : fullName}` });
      onCreated();
    } catch (err: unknown) {
      toast({ title: "Registration failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-[440px] shadow-xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>

        <h2 className="text-lg font-bold text-slate-900">Quick Registration</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Register patient in under 30 seconds</p>

        {/* Phone search */}
        <div className="mt-5">
          <label className="text-xs font-medium text-slate-600">Mobile Number</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setUseExisting(false); }}
              placeholder="Enter patient's phone number"
              className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1A2F5A] focus:ring-2 focus:ring-[#1A2F5A]/10 outline-none"
            />
          </div>
          {foundPatient && !useExisting && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Returning patient found</span>
              </div>
              <p className="text-sm font-medium text-slate-800 mt-1">{foundPatient.full_name} · {foundPatient.uhid}</p>
              <button onClick={() => setUseExisting(true)} className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-md hover:bg-emerald-200 transition-colors">
                Select This Patient
              </button>
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
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn("flex-1 h-10 rounded-lg text-xs font-medium capitalize transition-colors",
                        gender === g ? "bg-[#1A2F5A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!showOptional && (
              <button onClick={() => setShowOptional(true)} className="text-xs text-[#1A2F5A] font-medium hover:underline">
                + Add more details (optional)
              </button>
            )}
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
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600">Doctor</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-full h-10 px-2 border border-slate-200 rounded-lg text-sm mt-1 outline-none">
              <option value="">Select...</option>
              {filteredDoctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Priority */}
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-600">Priority</label>
          <div className="flex gap-1.5 mt-1">
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn("flex-1 h-8 rounded-lg text-[11px] font-medium capitalize transition-colors",
                  priority === p ? priorityLabels[p].active : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-11 mt-4 bg-[#1A2F5A] text-white rounded-lg text-[13px] font-semibold hover:bg-[#152647] active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {submitting ? "Registering..." : "Register & Issue Token →"}
        </button>
      </div>
    </div>
  );
};

export default WalkInModal;
