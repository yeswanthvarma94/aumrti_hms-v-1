import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientSearchPicker from "@/components/shared/PatientSearchPicker";

const HOSPITAL_ID = "8f3d08b3-8835-42a7-920e-fdf5a78260bc";

interface Props { open: boolean; onClose: () => void; }

export default function BookPackageModal({ open, onClose }: Props) {
  const [packages, setPackages] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("health_packages").select("id, package_name, price, package_type")
      .eq("hospital_id", HOSPITAL_ID).eq("is_active", true).order("display_order")
      .then(({ data }) => setPackages(data || []));
  }, []);

  const book = async () => {
    if (!patientId || !packageId || !scheduledDate) { toast.error("Please fill all required fields"); return; }
    setSaving(true);
    const { error } = await supabase.from("package_bookings").insert({
      hospital_id: HOSPITAL_ID,
      patient_id: patientId,
      package_id: packageId,
      booking_date: new Date().toISOString().split("T")[0],
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      status: "booked",
    });
    setSaving(false);
    if (error) { toast.error("Booking failed: " + error.message); return; }
    toast.success("Package booked successfully");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Book Health Package</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Patient *</Label>
            <PatientSearchPicker onSelect={(id) => setPatientId(id)} />
          </div>
          <div>
            <Label>Package *</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.package_name} — ₹{Number(p.price).toLocaleString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date *</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={book} disabled={saving}>{saving ? "Booking..." : "Book Package"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
