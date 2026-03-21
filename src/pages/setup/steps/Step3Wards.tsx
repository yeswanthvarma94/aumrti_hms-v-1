import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const wardTypes = [
  "general", "private", "semi_private", "icu", "nicu", "picu",
  "hdu", "surgical", "maternity", "emergency", "daycare",
] as const;

const wardTypeLabels: Record<string, string> = {
  general: "General", private: "Private", semi_private: "Semi-Private",
  icu: "ICU", nicu: "NICU", picu: "PICU", hdu: "HDU",
  surgical: "Surgical", maternity: "Maternity", emergency: "Emergency", daycare: "Daycare",
};

interface WardRow {
  name: string;
  type: string;
  beds: number;
}

interface Props {
  hospitalId: string;
  onComplete: () => void;
}

const Step3Wards: React.FC<Props> = ({ hospitalId, onComplete }) => {
  const { toast } = useToast();
  const [wards, setWards] = useState<WardRow[]>([
    { name: "General Ward", type: "general", beds: 20 },
    { name: "Private Rooms", type: "private", beds: 10 },
    { name: "ICU", type: "icu", beds: 6 },
  ]);
  const [saving, setSaving] = useState(false);

  const updateWard = (i: number, field: keyof WardRow, value: string | number) => {
    setWards((prev) => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w));
  };

  const removeWard = (i: number) => setWards((prev) => prev.filter((_, idx) => idx !== i));
  const addWard = () => setWards((prev) => [...prev, { name: "", type: "general", beds: 1 }]);

  const totalBeds = wards.reduce((sum, w) => sum + (w.beds || 0), 0);

  const handleSave = async () => {
    const valid = wards.filter((w) => w.name.trim() && w.beds > 0);
    if (valid.length === 0) {
      toast({ title: "Add at least one ward", variant: "destructive" });
      return;
    }
    setSaving(true);
    for (const ward of valid) {
      const { data: wardData, error: wardErr } = await supabase
        .from("wards")
        .insert({ hospital_id: hospitalId, name: ward.name, type: ward.type as any, total_beds: ward.beds, is_active: true })
        .select("id")
        .single();

      if (wardErr || !wardData) {
        toast({ title: "Error creating ward", description: wardErr?.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Create bed records
      const bedRows = Array.from({ length: ward.beds }, (_, i) => ({
        hospital_id: hospitalId,
        ward_id: wardData.id,
        bed_number: `Bed ${i + 1}`,
        status: "available" as const,
        is_active: true,
      }));
      const { error: bedErr } = await supabase.from("beds").insert(bedRows);
      if (bedErr) {
        toast({ title: "Error creating beds", description: bedErr.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onComplete();
  };

  return (
    <div>
      <span className="inline-block bg-[#EEF2FF] text-[#4F46E5] text-[11px] px-2.5 py-0.5 rounded-full font-medium mb-4">~5 min</span>
      <h2 className="text-[22px] font-bold text-foreground">Set up your wards and beds</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Add the wards in your hospital. You can edit these anytime.</p>

      {/* Table header */}
      <div className="grid grid-cols-[3fr_2fr_1fr_40px] gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
        <span>Ward Name</span><span>Ward Type</span><span>Beds</span><span />
      </div>

      <div className="space-y-2">
        {wards.map((w, i) => (
          <div key={i} className="grid grid-cols-[3fr_2fr_1fr_40px] gap-2 items-center">
            <Input value={w.name} onChange={(e) => updateWard(i, "name", e.target.value)} placeholder="Ward name" />
            <Select value={w.type} onValueChange={(v) => updateWard(i, "type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {wardTypes.map((t) => <SelectItem key={t} value={t}>{wardTypeLabels[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" min={1} max={500} value={w.beds} onChange={(e) => updateWard(i, "beds", parseInt(e.target.value) || 0)} />
            <button onClick={() => removeWard(i)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <button onClick={addWard} className="flex items-center gap-1.5 mt-3 text-sm text-primary font-medium hover:underline">
        <Plus size={14} /> Add Ward
      </button>

      <p className="text-[13px] text-muted-foreground mt-4">Total beds configured: <strong className="text-foreground">{totalBeds}</strong></p>

      <div className="flex justify-between mt-8">
        <div />
        <button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground px-7 py-2.5 rounded-lg text-sm font-semibold hover:bg-[hsl(220,54%,16%)] transition-colors disabled:opacity-40 active:scale-[0.97]">
          {saving ? "Saving..." : "Save & Continue →"}
        </button>
      </div>
    </div>
  );
};

export default Step3Wards;
