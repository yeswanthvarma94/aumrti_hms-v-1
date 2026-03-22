import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genders = ["male", "female", "other"] as const;

const PatientRegistrationModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
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

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
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

    // Generate UHID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId);
    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const uhid = `UHID-${dateStr}-${seq}`;

    // Compute DOB from age if no DOB given
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
    });

    setSaving(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Patient registered — ${uhid}` });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold text-foreground">Register New Patient</h2>
        <p className="text-xs text-muted-foreground mb-5">Fill in patient details below</p>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Patient's full name" />
          </div>

          {/* Phone */}
          <div>
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Mobile number" />
          </div>

          {/* Age + Gender + DOB */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Age</Label>
              <Input type="number" min={0} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="Age" />
            </div>
            <div>
              <Label>Gender</Label>
              <div className="flex gap-1 mt-1">
                {genders.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("gender", g)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      form.gender === g
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>DOB</Label>
              <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </div>
          </div>

          {/* Blood Group */}
          <div>
            <Label>Blood Group</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {bloodGroups.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => set("blood_group", form.blood_group === bg ? "" : bg)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.blood_group === bg
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Patient address" />
          </div>

          {/* Allergies + Chronic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Allergies</Label>
              <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin" />
            </div>
            <div>
              <Label>Chronic Conditions</Label>
              <Input value={form.chronic_conditions} onChange={(e) => set("chronic_conditions", e.target.value)} placeholder="Comma-separated" />
            </div>
          </div>

          {/* Insurance + ABHA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Insurance ID</Label>
              <Input value={form.insurance_id} onChange={(e) => set("insurance_id", e.target.value)} placeholder="Insurance / TPA ID" />
            </div>
            <div>
              <Label>ABHA ID</Label>
              <Input value={form.abha_id} onChange={(e) => set("abha_id", e.target.value)} placeholder="ABHA number" />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </div>
            <div>
              <Label>Emergency Contact Phone</Label>
              <Input type="tel" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
            </div>
          </div>
        </div>

        <Button className="w-full mt-6 h-11" onClick={handleSubmit} disabled={saving}>
          {saving ? "Registering…" : "Register Patient"}
        </Button>
      </div>
    </div>
  );
};

export default PatientRegistrationModal;
