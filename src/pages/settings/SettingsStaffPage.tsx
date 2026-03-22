import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Constants } from "@/integrations/supabase/types";

const roles = Constants.public.Enums.app_role;

const SettingsStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role: "doctor" as string, registration_number: "" });

  const { data: users, isLoading } = useQuery({
    queryKey: ["settings-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, role, is_active, registration_number")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addUser = useMutation({
    mutationFn: async () => {
      const { data: me } = await supabase.from("users").select("hospital_id").limit(1).single();
      if (!me) throw new Error("No hospital context");
      const { error } = await supabase.from("users").insert({
        id: crypto.randomUUID(),
        hospital_id: me.hospital_id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        role: form.role as any,
        registration_number: form.registration_number || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Staff member added" });
      qc.invalidateQueries({ queryKey: ["settings-staff"] });
      setShowForm(false);
      setForm({ full_name: "", email: "", phone: "", role: "doctor", registration_number: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const roleColor = (r: string) => {
    if (r === "doctor") return "bg-blue-50 text-blue-700 border-blue-200";
    if (r === "nurse") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (r === "hospital_admin" || r === "super_admin") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Doctors & Staff</h1>
            <p className="text-xs text-muted-foreground">{users?.length ?? 0} users</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:scale-[0.97]"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Staff"}
        </button>
      </div>

      {showForm && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1.5fr_auto] gap-3 items-end">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. Priya Sharma" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@hospital.com" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Reg. No</label>
              <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MH-12345" className="h-9" />
            </div>
            <button
              onClick={() => addUser.mutate()}
              disabled={!form.full_name || !form.email || addUser.isPending}
              className="bg-primary text-primary-foreground px-4 h-9 rounded-md text-sm font-medium disabled:opacity-40 active:scale-[0.97]"
            >
              {addUser.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Reg. No</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-6 py-3 font-medium text-foreground">{u.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${roleColor(u.role)}`}>
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.registration_number || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.is_active ? "default" : "secondary"} className="text-[10px]">
                    {u.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsStaffPage;
