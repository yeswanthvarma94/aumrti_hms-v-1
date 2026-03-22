import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SettingsDepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "clinical" as string });

  const { data: departments, isLoading } = useQuery({
    queryKey: ["settings-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, type, is_active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addDept = useMutation({
    mutationFn: async () => {
      const { data: me } = await supabase.from("users").select("hospital_id").limit(1).single();
      if (!me) throw new Error("No hospital context");
      const { error } = await supabase.from("departments").insert({
        hospital_id: me.hospital_id,
        name: form.name,
        type: form.type as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Department added" });
      qc.invalidateQueries({ queryKey: ["settings-departments"] });
      setShowForm(false);
      setForm({ name: "", type: "clinical" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Departments</h1>
            <p className="text-xs text-muted-foreground">{departments?.length ?? 0} departments</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:scale-[0.97]">
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Add Department"}
        </button>
      </div>

      {showForm && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Department Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Medicine" className="h-9" />
            </div>
            <div className="w-40">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="clinical">Clinical</option>
                <option value="administrative">Administrative</option>
                <option value="support">Support</option>
              </select>
            </div>
            <button onClick={() => addDept.mutate()} disabled={!form.name || addDept.isPending} className="bg-primary text-primary-foreground px-4 h-9 rounded-md text-sm font-medium disabled:opacity-40 active:scale-[0.97]">
              {addDept.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>}
            {departments?.map((d) => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-6 py-3 font-medium text-foreground">{d.name}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">{d.type}</span></td>
                <td className="px-4 py-3"><Badge variant={d.is_active ? "default" : "secondary"} className="text-[10px]">{d.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsDepartmentsPage;
