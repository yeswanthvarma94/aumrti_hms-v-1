import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useHospitalId } from "@/hooks/useHospitalId";

const CATEGORIES = ["Haematology", "Biochemistry", "Pathology", "Microbiology", "Serology", "Immunology"];

const SettingsLabTestsPage: React.FC = () => {
  const { toast } = useToast();
  const { hospitalId } = useHospitalId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ test_name: "", test_code: "", category: "Haematology", sample_type: "Blood", unit: "", normal_min: "", normal_max: "", tat_minutes: "120", fee: "0" });

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["settings-lab-tests", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      const { data, error } = await supabase
        .from("lab_test_master")
        .select("id, test_name, test_code, category, sample_type, unit, normal_min, normal_max, tat_minutes, is_active, fee")
        .eq("hospital_id", hospitalId)
        .order("test_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!hospitalId,
  });

  const filtered = tests.filter((t: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.test_name?.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q);
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lab_test_master").insert({
        hospital_id: hospitalId!,
        test_name: form.test_name,
        test_code: form.test_code,
        category: form.category,
        sample_type: form.sample_type,
        unit: form.unit || null,
        normal_min: form.normal_min ? Number(form.normal_min) : null,
        normal_max: form.normal_max ? Number(form.normal_max) : null,
        tat_minutes: form.tat_minutes ? Number(form.tat_minutes) : null,
        fee: form.fee ? Number(form.fee) : 0,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-lab-tests"] });
      setShowAdd(false);
      setForm({ test_name: "", test_code: "", category: "Haematology", sample_type: "Blood", unit: "", normal_min: "", normal_max: "", tat_minutes: "120", fee: "0" });
      toast({ title: "Test added" });
    },
    onError: (err: any) => toast({ title: "Failed to add test", description: err.message, variant: "destructive" }),
  });

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("lab_test_master").update({ is_active: active }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["settings-lab-tests"] });
  };

  const formatRange = (min: number | null, max: number | null) => {
    if (min != null && max != null) return `${min}–${max}`;
    if (min != null) return `≥${min}`;
    if (max != null) return `≤${max}`;
    return "—";
  };

  return (
    <SettingsPageWrapper title="Lab Test Master" hideSave>
      <div className="space-y-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tests..." className="pl-9 h-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1"><Plus size={14} /> Add Test</Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} test{filtered.length !== 1 ? "s" : ""}</p>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Test Name</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Code</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Category</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Sample</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Normal Range</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">TAT</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right">Fee (₹)</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Active</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No tests found. Add your first lab test.</td></tr>}
              {filtered.map((t: any) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-foreground">{t.test_name}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline">{t.test_code}</Badge></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.category}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.sample_type}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatRange(t.normal_min, t.normal_max)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.tat_minutes ? `${t.tat_minutes}m` : "—"}</td>
                  <td className="px-3 py-2.5 text-foreground font-mono text-right">{t.fee ? `₹${Number(t.fee).toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-3 py-2.5"><Switch checked={t.is_active} onCheckedChange={(v) => toggleActive(t.id, v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lab Test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Test Name *</Label><Input value={form.test_name} onChange={(e) => setForm({ ...form, test_name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.test_code} onChange={(e) => setForm({ ...form, test_code: e.target.value })} className="mt-1" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sample Type</Label><Input value={form.sample_type} onChange={(e) => setForm({ ...form, sample_type: e.target.value })} className="mt-1" /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Normal Min</Label><Input type="number" value={form.normal_min} onChange={(e) => setForm({ ...form, normal_min: e.target.value })} className="mt-1" /></div>
              <div><Label>Normal Max</Label><Input type="number" value={form.normal_max} onChange={(e) => setForm({ ...form, normal_max: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>TAT (minutes)</Label><Input type="number" value={form.tat_minutes} onChange={(e) => setForm({ ...form, tat_minutes: e.target.value })} className="mt-1" /></div>
              <div><Label>Fee (₹)</Label><Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => addMutation.mutate()} disabled={!form.test_name || !form.test_code || addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Save Test"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageWrapper>
  );
};

export default SettingsLabTestsPage;
