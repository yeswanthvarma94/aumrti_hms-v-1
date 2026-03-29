import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (doctorName: string) => void;
  hospitalId: string;
  editDoc?: any;
}

const AddReferralDoctorModal: React.FC<Props> = ({ open, onClose, onSaved, hospitalId, editDoc }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    doctor_name: "", specialty: "", qualification: "", clinic_hospital: "",
    phone: "", email: "", city: "", address: "", notes: "",
  });

  useEffect(() => {
    if (editDoc) setForm({
      doctor_name: editDoc.doctor_name || "", specialty: editDoc.specialty || "",
      qualification: editDoc.qualification || "", clinic_hospital: editDoc.clinic_hospital || "",
      phone: editDoc.phone || "", email: editDoc.email || "", city: editDoc.city || "",
      address: editDoc.address || "", notes: editDoc.notes || "",
    });
    else setForm({ doctor_name: "", specialty: "", qualification: "", clinic_hospital: "", phone: "", email: "", city: "", address: "", notes: "" });
  }, [editDoc, open]);

  const save = async () => {
    if (!form.doctor_name || !form.phone) {
      toast({ title: "Name and phone required", variant: "destructive" });
      return;
    }
    const payload = { ...form, hospital_id: hospitalId };
    const { error } = editDoc
      ? await supabase.from("referral_doctors").update(payload).eq("id", editDoc.id)
      : await supabase.from("referral_doctors").insert(payload);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editDoc ? "Doctor updated" : "Referral doctor added" });
    onSaved(form.doctor_name);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editDoc ? "Edit" : "Add"} Referral Doctor</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Doctor Name *</Label><Input value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Specialty</Label><Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /></div>
            <div><Label>Qualification</Label><Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} /></div>
          </div>
          <div><Label>Clinic / Hospital</Label><Input value={form.clinic_hospital} onChange={e => setForm({ ...form, clinic_hospital: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={save}>{editDoc ? "Update" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddReferralDoctorModal;
