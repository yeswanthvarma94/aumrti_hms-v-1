import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, X, Users, Stethoscope, HeartPulse,
  Receipt, Pill, TestTube, ClipboardList, Shield, Wrench, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type AppRole = "super_admin" | "hospital_admin" | "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_tech" | "accountant";

interface StaffForm {
  full_name: string;
  phone: string;
  email: string;
  role: AppRole;
  department_id: string;
  registration_number: string;
  ward_id: string; // UI-only, not persisted to users table
}

const EMPTY_FORM: StaffForm = {
  full_name: "", phone: "", email: "", role: "doctor",
  department_id: "", registration_number: "", ward_id: "",
};

/* ─── Role config ─── */
const ROLE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  doctor:         { icon: Stethoscope,   label: "Doctor",      color: "bg-blue-50 text-blue-700 border-blue-200" },
  nurse:          { icon: HeartPulse,    label: "Nurse",       color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  accountant:     { icon: Receipt,       label: "Billing",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  pharmacist:     { icon: Pill,          label: "Pharmacist",  color: "bg-violet-50 text-violet-700 border-violet-200" },
  lab_tech:       { icon: TestTube,      label: "Lab Tech",    color: "bg-rose-50 text-rose-700 border-rose-200" },
  receptionist:   { icon: ClipboardList, label: "Reception",   color: "bg-green-50 text-green-700 border-green-200" },
  hospital_admin: { icon: Shield,        label: "Admin",       color: "bg-[hsl(222,55%,23%)] text-white border-transparent" },
  super_admin:    { icon: Shield,        label: "Super Admin", color: "bg-[hsl(222,55%,23%)] text-white border-transparent" },
};

const ROLE_CARDS: { role: AppRole; icon: React.ElementType; label: string }[] = [
  { role: "doctor",         icon: Stethoscope,   label: "Doctor" },
  { role: "nurse",          icon: HeartPulse,     label: "Nurse" },
  { role: "accountant",     icon: Receipt,        label: "Billing" },
  { role: "pharmacist",     icon: Pill,           label: "Pharmacist" },
  { role: "lab_tech",       icon: TestTube,       label: "Lab Tech" },
  { role: "receptionist",   icon: ClipboardList,  label: "Reception" },
  { role: "hospital_admin", icon: Shield,         label: "Admin / CEO" },
];

const FILTER_TABS = [
  { key: "all",          label: "All" },
  { key: "doctor",       label: "Doctors" },
  { key: "nurse",        label: "Nurses" },
  { key: "accountant",   label: "Billing" },
  { key: "pharmacist",   label: "Pharmacist" },
  { key: "lab_tech",     label: "Lab" },
  { key: "receptionist", label: "Reception" },
  { key: "admin",        label: "Admin" },
];

/* ─── Bulk doctor row ─── */
interface BulkRow { name: string; speciality: string; phone: string; dept_id: string }
const EMPTY_BULK: BulkRow = { name: "", speciality: "", phone: "", dept_id: "" };

/* ─── Page ─── */
const SettingsStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filter, setFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([{ ...EMPTY_BULK }]);

  /* ─── Queries ─── */
  const { data: users, isLoading } = useQuery({
    queryKey: ["settings-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, role, is_active, registration_number, department_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["settings-departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: wards } = useQuery({
    queryKey: ["settings-wards-list"],
    queryFn: async () => {
      const { data } = await supabase.from("wards").select("id, name").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  /* ─── Computed ─── */
  const filtered = useMemo(() => {
    if (!users) return [];
    if (filter === "all") return users;
    if (filter === "admin") return users.filter((u) => u.role === "hospital_admin" || u.role === "super_admin");
    return users.filter((u) => u.role === filter);
  }, [users, filter]);

  const doctorCount = useMemo(() => users?.filter((u) => u.role === "doctor").length ?? 0, [users]);

  /* ─── Mutations ─── */
  const getHospitalId = async () => {
    const { data } = await supabase.from("users").select("hospital_id").limit(1).single();
    if (!data) throw new Error("No hospital context");
    return data.hospital_id;
  };

  // Only send department_id for roles that actually use the departments dropdown
  const getSafeDepartmentId = () => {
    if (form.role !== "doctor") return null;
    return form.department_id && form.department_id.trim() !== "" ? form.department_id : null;
  };

  const saveStaff = useMutation({
    mutationFn: async () => {
      const hid = await getHospitalId();
      const deptId = getSafeDepartmentId();
      if (editingId) {
        const { error } = await supabase.from("users").update({
          full_name: form.full_name,
          phone: form.phone || null,
          email: form.email,
          role: form.role as any,
          department_id: deptId,
          registration_number: form.registration_number || null,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const newId = crypto.randomUUID();
        const { error } = await supabase.from("users").insert({
          id: newId,
          hospital_id: hid,
          full_name: form.full_name,
          email: form.email || `${form.phone || Date.now()}@placeholder.local`,
          phone: form.phone || null,
          role: form.role as any,
          department_id: deptId,
          registration_number: form.registration_number || null,
          is_active: true,
          can_login: false,
          auth_user_id: null,
        } as any);
        if (error) throw error;

        // Also create a staff_profiles row for HR/payroll
        await (supabase as any).from("staff_profiles").insert({
          hospital_id: hid,
          user_id: newId,
          employee_id: form.employee_id || null,
          designation: form.designation || form.role,
          employment_type: "permanent",
          department_id: deptId,
          registration_number: form.registration_number || null,
          is_active: true,
        });
      }
    },
    onSuccess: () => {
      toast({ title: `${form.full_name} ${editingId ? "updated" : "added"} as ${ROLE_META[form.role]?.label ?? form.role} ✓` });
      qc.invalidateQueries({ queryKey: ["settings-staff"] });
      closeDrawer();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("users").update({ is_active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings-staff"] }),
  });

  const bulkSave = useMutation({
    mutationFn: async () => {
      const hid = await getHospitalId();
      const valid = bulkRows.filter((r) => r.name.trim());
      if (!valid.length) return;
      const rows = valid.map((r) => ({
        id: crypto.randomUUID(),
        hospital_id: hid,
        full_name: r.name,
        email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@placeholder.local`,
        phone: r.phone || null,
        role: "doctor" as const,
        department_id: r.dept_id && r.dept_id.trim() !== "" ? r.dept_id : null,
        registration_number: null,
        is_active: true,
        can_login: false,
        auth_user_id: null,
      }));
      const { error } = await supabase.from("users").insert(rows as any);
      if (error) throw error;
      return valid.length;
    },
    onSuccess: (count) => {
      toast({ title: `${count} doctors added successfully` });
      qc.invalidateQueries({ queryKey: ["settings-staff"] });
      setBulkOpen(false);
      setBulkRows([{ ...EMPTY_BULK }]);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ─── Helpers ─── */
  const openDrawer = (user?: any) => {
    if (user) {
      setEditingId(user.id);
      setForm({
        full_name: user.full_name, phone: user.phone ?? "", email: user.email,
        role: user.role, department_id: user.department_id ?? "", registration_number: user.registration_number ?? "", ward_id: "",
      });
    } else {
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM }); };

  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const deptName = (id: string | null) => departments?.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden relative">
      {/* HEADER */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Doctors & Staff</h1>
            <p className="text-xs text-muted-foreground">Settings › Doctors & Staff</p>
          </div>
        </div>
        <button onClick={() => openDrawer()} className="flex items-center gap-1.5 bg-[hsl(222,55%,23%)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:scale-[0.97]">
          <Plus size={14} /> Add Staff Member
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex-shrink-0 px-6 py-2.5 border-b border-border flex gap-1.5 overflow-x-auto">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "px-4 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors active:scale-[0.97]",
              filter === t.key ? "bg-[hsl(222,55%,23%)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* QUICK ADD DOCTORS BANNER */}
      {!isLoading && doctorCount === 0 && (
        <div className="flex-shrink-0 mx-6 mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-[13px] text-blue-800 font-medium">👨‍⚕️ No doctors added yet — OPD and IPD are blocked</p>
          <button onClick={() => { setBulkOpen(true); setBulkRows([{ ...EMPTY_BULK }, { ...EMPTY_BULK }, { ...EMPTY_BULK }]); }}
            className="text-sm font-medium text-blue-700 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-100 active:scale-[0.97]">
            Quick Add Doctors
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto">
        {!isLoading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Users size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No staff added yet</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">Add your first doctor to start using clinical modules</p>
            <button onClick={() => openDrawer()} className="flex items-center gap-1.5 bg-[hsl(222,55%,23%)] text-white px-4 py-2 rounded-lg text-sm font-medium active:scale-[0.97]">
              <Plus size={14} /> Add First Doctor
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr className="text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>}
              {filtered.map((u) => {
                const meta = ROLE_META[u.role] ?? ROLE_META.receptionist;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-6 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[hsl(222,55%,23%)] text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{u.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium", meta.color)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{deptName(u.department_id)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{u.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", u.is_active ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                        <span className="text-[12px] text-muted-foreground">{u.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDrawer(u)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">Edit</button>
                        <button
                          onClick={() => toggleActive.mutate({ id: u.id, active: u.is_active })}
                          className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted"
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── SLIDE-OVER DRAWER ─── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingId ? "Edit Staff Member" : "Add Staff Member"}</h2>
              <button onClick={closeDrawer} className="text-muted-foreground hover:text-foreground active:scale-95"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Role selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_CARDS.map((rc) => {
                    const Icon = rc.icon;
                    const selected = form.role === rc.role;
                    return (
                      <button
                        key={rc.role}
                        onClick={() => setForm({ ...form, role: rc.role, department_id: "", ward_id: "", registration_number: "" })}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] text-left transition-colors active:scale-[0.98]",
                          selected
                            ? "border-[hsl(222,55%,23%)] bg-blue-50"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <Icon size={16} className={selected ? "text-[hsl(222,55%,23%)]" : "text-muted-foreground"} />
                        <span className={cn("text-[13px] font-medium", selected ? "text-[hsl(222,55%,23%)]" : "text-foreground")}>{rc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic details */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Details</label>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Full Name *</label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. Priya Sharma" className="h-10" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Phone Number *</label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" className="h-10" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Email Address <span className="text-muted-foreground/60">(optional)</span></label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@hospital.com" className="h-10" />
                </div>
              </div>

              {/* Role-specific fields */}
              {form.role === "doctor" && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doctor Details</label>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Department *</label>
                    <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Select department</option>
                      {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Registration No (MCI/NMC)</label>
                    <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MH-12345" className="h-10" />
                  </div>
                </div>
              )}

              {form.role === "nurse" && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nurse Details</label>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ward Assignment <span className="text-muted-foreground/60">(display only)</span></label>
                    <select value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Select ward</option>
                      {wards?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Nursing Registration No</label>
                    <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="Optional" className="h-10" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-border flex gap-3">
              <button onClick={closeDrawer} className="flex-1 h-12 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98]">
                Cancel
              </button>
              <button
                onClick={() => saveStaff.mutate()}
                disabled={!form.full_name || (!form.phone && !form.email) || saveStaff.isPending}
                className="flex-[2] h-12 rounded-lg bg-[hsl(222,55%,23%)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
              >
                {saveStaff.isPending ? "Saving..." : editingId ? "Update Staff Member" : "Save Staff Member"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── BULK ADD DOCTORS MODAL ─── */}
      {bulkOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center" onClick={() => setBulkOpen(false)}>
            <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-[700px] max-h-[calc(100vh-100px)] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Quick Add Doctors</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Add multiple doctors at once</p>
                </div>
                <button onClick={() => setBulkOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_28px] gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  <span>Full Name</span><span>Speciality</span><span>Phone</span><span>Department</span><span />
                </div>
                {bulkRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_28px] gap-2 items-center">
                    <Input value={row.name} onChange={(e) => {
                      const r = [...bulkRows]; r[i] = { ...r[i], name: e.target.value }; setBulkRows(r);
                    }} placeholder="Dr. Example" className="h-9" />
                    <Input value={row.speciality} onChange={(e) => {
                      const r = [...bulkRows]; r[i] = { ...r[i], speciality: e.target.value }; setBulkRows(r);
                    }} placeholder="General Medicine" className="h-9" />
                    <Input value={row.phone} onChange={(e) => {
                      const r = [...bulkRows]; r[i] = { ...r[i], phone: e.target.value }; setBulkRows(r);
                    }} placeholder="9876543210" className="h-9" />
                    <select value={row.dept_id} onChange={(e) => {
                      const r = [...bulkRows]; r[i] = { ...r[i], dept_id: e.target.value }; setBulkRows(r);
                    }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">Dept</option>
                      {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button onClick={() => setBulkRows((r) => r.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {bulkRows.length < 10 && (
                  <button onClick={() => setBulkRows((r) => [...r, { ...EMPTY_BULK }])} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mt-1">
                    <Plus size={14} /> Add Another Doctor
                  </button>
                )}
              </div>

              <div className="flex-shrink-0 px-6 py-4 border-t border-border">
                <button
                  onClick={() => bulkSave.mutate()}
                  disabled={!bulkRows.some((r) => r.name.trim()) || bulkSave.isPending}
                  className="w-full h-11 rounded-lg bg-[hsl(222,55%,23%)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                >
                  {bulkSave.isPending ? "Saving..." : `Save All Doctors (${bulkRows.filter((r) => r.name.trim()).length})`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsStaffPage;
