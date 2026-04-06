import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useHospitalId from "@/hooks/useHospitalId";

const SettingsRadiologyPage: React.FC = () => {
  const { toast } = useToast();
  const hospitalId = useHospitalId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", modality_type: "", fee: "0" });

  const { data: modalities = [], isLoading } = useQuery({
    queryKey: ["settings-radiology-modalities", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      const { data, error } = await supabase
        .from("radiology_modalities")
        .select("id, name, modality_type, is_active, fee")
        .eq("hospital_id", hospitalId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!hospitalId,
  });

  const filtered = modalities.filter((m: any) => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.modality_type?.toLowerCase().includes(q);
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("radiology_modalities").insert({
        hospital_id: hospitalId,
        name: form.name,
        modality_type: form.modality_type.toLowerCase().replace(/\s+/g, "_"),
        fee: form.fee ? Number(form.fee) : 0,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-radiology-modalities"] });
      setShowAdd(false);
      setForm({ name: "", modality_type: "", fee: "0" });
      toast({ title: "Modality added" });
    },
    onError: (err: any) => toast({ title: "Failed to add", description: err.message, variant: "destructive" }),
  });

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("radiology_modalities").update({ is_active: active }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["settings-radiology-modalities"] });
  };

  const updateFee = async (id: string, fee: string) => {
    const { error } = await supabase.from("radiology_modalities").update({ fee: Number(fee) || 0 }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["settings-radiology-modalities"] });
    toast({ title: "Fee updated" });
  };

  return (
    <SettingsPageWrapper title="Radiology Modalities" hideSave>
      <div className="space-y-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search modalities..." className="pl-9 h-9" />
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1"><Plus size={14} /> Add Modality</Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} modalit{filtered.length !== 1 ? "ies" : "y"}</p>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Type Code</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right">Fee (₹)</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Active</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No modalities found.</td></tr>}
              {filtered.map((m: any) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-foreground">{m.name}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline">{m.modality_type}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    <Input
                      type="number"
                      defaultValue={m.fee || 0}
                      onBlur={(e) => updateFee(m.id, e.target.value)}
                      className="w-24 h-7 text-right font-mono ml-auto"
                    />
                  </td>
                  <td className="px-3 py-2.5"><Switch checked={m.is_active} onCheckedChange={(v) => toggleActive(m.id, v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Radiology Modality</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PET-CT" className="mt-1" /></div>
            <div><Label>Type Code *</Label><Input value={form.modality_type} onChange={(e) => setForm({ ...form, modality_type: e.target.value })} placeholder="e.g. pet_ct" className="mt-1" /></div>
            <div><Label>Fee (₹)</Label><Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button onClick={() => addMutation.mutate()} disabled={!form.name || !form.modality_type || addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Save Modality"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageWrapper>
  );
};

export default SettingsRadiologyPage;
