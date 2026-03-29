import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDPDPConsentText } from "@/lib/compliance-checks";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genders = ["male", "female", "other"] as const;

const PatientRegistrationModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(false);
  const [hospitalName, setHospitalName] = useState("Hospital");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    age: "",
    gender: "" as string,
    dob: "",
    blood_group: "",
    address: "",
    allergies: "",
    chronic_conditions: "",
    insurance_id: "",
    abha_id: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    supabase.from("users").select("hospital_id").limit(1).single().then(({ data }) => {
      if (data?.hospital_id) {
        supabase.from("hospitals").select("name").eq("id", data.hospital_id).maybeSingle().then(({ data: h }) => {
          if (h?.name) setHospitalName(h.name);
        });
      }
    });
  }, []);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      errors.full_name = "Name must be at least 2 characters";
    }
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g, ""))) {
      errors.phone = "Phone must be exactly 10 digits";
    }
    if (form.dob) {
      const dobDate = new Date(form.dob);
      if (dobDate >= new Date()) errors.dob = "Date of birth must be in the past";
    }
    if (!dpdpConsent) {
      errors.dpdp = "Patient must consent to data collection";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: "Please fix the highlighted errors", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: userData } = await supabase.from("users").select("hospital_id").limit(1).single();
    if (!userData) {
      toast({ title: "Could not determine hospital", variant: "destructive" });
      setSaving(false);
      return;
    }
    const hospitalId = userData.hospital_id;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId);
    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const uhid = `UHID-${dateStr}-${seq}`;

    let dob = form.dob || null;
    if (!dob && form.age) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - parseInt(form.age));
      dob = d.toISOString().slice(0, 10);
    }

    const chronic = form.chronic_conditions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("patients").insert({
      hospital_id: hospitalId,
      uhid,
      full_name: form.full_name.trim(),
      phone: form.phone || null,
      gender: (form.gender as "male" | "female" | "other") || null,
      dob,
      blood_group: form.blood_group || null,
      address: form.address || null,
      allergies: form.allergies || null,
      chronic_conditions: chronic.length ? chronic : null,
      insurance_id: form.insurance_id || null,
      abha_id: form.abha_id || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      referral_source: form.referral_source || null,
    } as any);

    setSaving(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      // Log DPDP consent
      const consentText = getDPDPConsentText(hospitalName);
      // Get the patient id for consent record
      const { data: newPatient } = await supabase.from("patients").select("id").eq("hospital_id", hospitalId).eq("uhid", uhid).maybeSingle();
      if (newPatient) {
        await supabase.from("patient_consents").insert({
          hospital_id: hospitalId,
          patient_id: newPatient.id,
          consent_type: "data_collection",
          consent_given: true,
          consent_text: consentText,
        } as any);
      }
      toast({ title: `Patient registered — ${uhid}` });
      onSuccess();
    }
  };

  const inputClass = "w-full h-[38px] px-3 border border-border rounded-lg text-sm bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-lg flex flex-col overflow-hidden"
        style={{ width: "min(640px, calc(100vw - 48px))", maxHeight: "calc(100vh - 80px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Register New Patient</h2>
            <p className="text-[12px] text-muted-foreground">Fill in patient details below</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <div className="px-7 pb-2 flex-1 overflow-hidden flex flex-col gap-2.5">

          {/* ROW 1: Name + Phone + DOB */}
          <div className="flex gap-3">
            <div className="flex-[2] min-w-0">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <input value={form.full_name} onChange={(e) => { set("full_name", e.target.value); setFieldErrors(prev => ({ ...prev, full_name: "" })); }}
                placeholder="Patient's full name" className={cn(inputClass, fieldErrors.full_name && "border-destructive")} />
              {fieldErrors.full_name && <p className="text-destructive text-[11px] mt-0.5">{fieldErrors.full_name}</p>}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => { set("phone", e.target.value); setFieldErrors(prev => ({ ...prev, phone: "" })); }}
                placeholder="Mobile number" className={cn(inputClass, fieldErrors.phone && "border-destructive")} />
              {fieldErrors.phone && <p className="text-destructive text-[11px] mt-0.5">{fieldErrors.phone}</p>}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">DOB</label>
              <input type="date" value={form.dob} onChange={(e) => { set("dob", e.target.value); setFieldErrors(prev => ({ ...prev, dob: "" })); }}
                max={new Date().toISOString().split("T")[0]}
                className={cn(inputClass, fieldErrors.dob && "border-destructive")} />
              {fieldErrors.dob && <p className="text-destructive text-[11px] mt-0.5">{fieldErrors.dob}</p>}
            </div>
          </div>

          {/* ROW 2: Age + Gender + Blood Group */}
          <div className="flex gap-4 items-end">
            <div className="w-[72px] flex-shrink-0">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Age</label>
              <input type="number" min={0} max={120} value={form.age} onChange={(e) => set("age", e.target.value)}
                placeholder="—" className={inputClass} />
            </div>
            <div className="flex-shrink-0">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Gender</label>
              <div className="flex gap-1">
                {genders.map((g) => (
                  <button key={g} type="button" onClick={() => set("gender", g)}
                    className={cn(
                      "h-[32px] px-3.5 rounded-full text-[11px] font-medium border transition-colors capitalize",
                      form.gender === g
                        ? "bg-[hsl(222,55%,23%)] text-white border-[hsl(222,55%,23%)]"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    )}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Blood Group</label>
              <div className="flex gap-1 flex-wrap">
                {bloodGroups.map((bg) => (
                  <button key={bg} type="button"
                    onClick={() => set("blood_group", form.blood_group === bg ? "" : bg)}
                    className={cn(
                      "h-[32px] px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                      form.blood_group === bg
                        ? "bg-destructive/10 text-destructive border-destructive/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: Address (single line) */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Address</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)}
              placeholder="Door no, Street, Area, City, Pincode" className={inputClass} />
          </div>

          {/* ROW 4: Allergies + Chronic Conditions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Allergies</label>
              <input value={form.allergies} onChange={(e) => set("allergies", e.target.value)}
                placeholder="e.g. Penicillin" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Chronic Conditions</label>
              <input value={form.chronic_conditions} onChange={(e) => set("chronic_conditions", e.target.value)}
                placeholder="DM, HTN (comma-separated)" className={inputClass} />
            </div>
          </div>

          {/* ROW 5: Insurance + ABHA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Insurance / TPA ID <span className="text-muted-foreground/60">(Optional)</span></label>
              <input value={form.insurance_id} onChange={(e) => set("insurance_id", e.target.value)}
                placeholder="Insurance / TPA ID" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">ABHA ID <span className="text-muted-foreground/60">(Optional)</span></label>
              <input value={form.abha_id} onChange={(e) => set("abha_id", e.target.value)}
                placeholder="ABHA number" className={inputClass} />
            </div>
          </div>

          {/* ROW 6: Emergency Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Emergency Contact Name</label>
              <input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)}
                placeholder="Contact name" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Emergency Contact Phone</label>
              <input type="tel" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)}
                placeholder="Contact phone" className={inputClass} />
            </div>
          </div>
        </div>

        {/* DPDP Consent */}
        <div className="px-7 pb-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={dpdpConsent}
              onChange={(e) => setDpdpConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              {getDPDPConsentText(hospitalName)}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 flex-shrink-0 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={saving || !dpdpConsent}
            className="w-full h-[44px] bg-[hsl(222,55%,23%)] text-white rounded-lg text-[14px] font-semibold hover:bg-[hsl(222,55%,18%)] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? "Registering…" : "Register Patient →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientRegistrationModal;
