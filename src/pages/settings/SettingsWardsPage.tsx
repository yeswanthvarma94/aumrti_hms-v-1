import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Constants } from "@/integrations/supabase/types";

const wardTypes = Constants.public.Enums.ward_type;

const SettingsWardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "general" as string, total_beds: "10" });

  const { data: wards, isLoading } = useQuery({
    queryKey: ["settings-wards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wards")
        .select("id, name, type, total_beds, is_active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addWard = useMutation({
    mutationFn: async () => {
      const { data: me } = await supabase.from("users").select("hospital_id").limit(1).single();
      if (!me) throw new Error("No hospital context");
      const beds = parseInt(form.total_beds) || 10;
      const { data: ward, error } = await supabase.from("wards").insert({
        hospital_id: me.hospital_id,
        name: form.name,
        type: form.type as any,
        total_beds: beds,
      }).select("id").single();
      if (error) throw error;
      // Auto-create beds
      const bedRows = Array.from({ length: beds }, (_, i) => ({
        hospital_id: me.hospital_id,
        ward_id: ward.id,
        bed_number: `${form.name.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
        status: "available" as const,
      }));
      await supabase.from("beds").insert(bedRows);
    },
    onSuccess: () => {
      toast({ title: "Ward & beds created" });
      qc.invalidateQueries({ queryKey: ["settings-wards"] });
      setShowForm(false);
      setForm({ name: "", type: "general", total_beds: "10" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Wards & Beds</h1>
            <p className="text-xs text-muted-foreground">{wards?.length ?? 0} wards</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:scale-[0.97]">
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Add Ward"}
        </button>
      </div>

      {showForm && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ward Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Ward A" className="h-9" />
            </div>
            <div className="w-40">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {wardTypes.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Beds</label>
              <Input type="number" value={form.total_beds} onChange={(e) => setForm({ ...form, total_beds: e.target.value })} className="h-9" />
            </div>
            <button onClick={() => addWard.mutate()} disabled={!form.name || addWard.isPending} className="bg-primary text-primary-foreground px-4 h-9 rounded-md text-sm font-medium disabled:opacity-40 active:scale-[0.97]">
              {addWard.isPending ? "Creating..." : "Save"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Beds will be auto-created with sequential numbers.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-2.5 font-medium">Ward Name</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Beds</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>}
            {wards?.map((w) => (
              <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-6 py-3 font-medium text-foreground">{w.name}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">{w.type.replace("_", " ")}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{w.total_beds}</td>
                <td className="px-4 py-3"><Badge variant={w.is_active ? "default" : "secondary"} className="text-[10px]">{w.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsWardsPage;
