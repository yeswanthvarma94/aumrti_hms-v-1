import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const SettingsServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "consultation", fee: "", follow_up_fee: "" });

  const { data: services, isLoading } = useQuery({
    queryKey: ["settings-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_master")
        .select("id, name, category, fee, follow_up_fee, is_active, gst_applicable")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addService = useMutation({
    mutationFn: async () => {
      const { data: me } = await supabase.from("users").select("hospital_id").limit(1).single();
      if (!me) throw new Error("No hospital context");
      const { error } = await supabase.from("service_master").insert({
        hospital_id: me.hospital_id,
        name: form.name,
        category: form.category,
        fee: parseFloat(form.fee) || 0,
        follow_up_fee: form.follow_up_fee ? parseFloat(form.follow_up_fee) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Service added" });
      qc.invalidateQueries({ queryKey: ["settings-services"] });
      setShowForm(false);
      setForm({ name: "", category: "consultation", fee: "", follow_up_fee: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Services & Fees</h1>
            <p className="text-xs text-muted-foreground">{services?.length ?? 0} services</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:scale-[0.97]">
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Add Service"}
        </button>
      </div>

      {showForm && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Service Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="OPD Consultation" className="h-9" />
            </div>
            <div className="w-40">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="consultation">Consultation</option>
                <option value="procedure">Procedure</option>
                <option value="lab">Lab</option>
                <option value="radiology">Radiology</option>
                <option value="package">Package</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="w-28">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fee (₹) *</label>
              <Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="500" className="h-9" />
            </div>
            <div className="w-28">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Follow-up (₹)</label>
              <Input type="number" value={form.follow_up_fee} onChange={(e) => setForm({ ...form, follow_up_fee: e.target.value })} placeholder="200" className="h-9" />
            </div>
            <button onClick={() => addService.mutate()} disabled={!form.name || !form.fee || addService.isPending} className="bg-primary text-primary-foreground px-4 h-9 rounded-md text-sm font-medium disabled:opacity-40 active:scale-[0.97]">
              {addService.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-2.5 font-medium">Service Name</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium text-right">Fee</th>
              <th className="px-4 py-2.5 font-medium text-right">Follow-up</th>
              <th className="px-4 py-2.5 font-medium">GST</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>}
            {services?.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-6 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">{s.category}</span></td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">₹{Number(s.fee).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{s.follow_up_fee ? `₹${Number(s.follow_up_fee).toLocaleString("en-IN")}` : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.gst_applicable ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsServicesPage;
