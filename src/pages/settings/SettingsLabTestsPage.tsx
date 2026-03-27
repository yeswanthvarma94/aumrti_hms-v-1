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

const mockTests = [
  { id: "1", name: "Complete Blood Count", code: "CBC", category: "Haematology", sample: "Blood", unit: "cells/μL", normalRange: "4500-11000", tat: "2h", active: true },
  { id: "2", name: "Blood Glucose Fasting", code: "BGF", category: "Biochemistry", sample: "Blood", unit: "mg/dL", normalRange: "70-100", tat: "1h", active: true },
  { id: "3", name: "Liver Function Test", code: "LFT", category: "Biochemistry", sample: "Blood", unit: "various", normalRange: "varies", tat: "3h", active: true },
  { id: "4", name: "Urine Routine", code: "UR", category: "Pathology", sample: "Urine", unit: "—", normalRange: "—", tat: "1h", active: true },
  { id: "5", name: "Thyroid Profile", code: "TFT", category: "Biochemistry", sample: "Blood", unit: "various", normalRange: "varies", tat: "4h", active: true },
];

const SettingsLabTestsPage: React.FC = () => {
  const { toast } = useToast();
  const [tests, setTests] = useState(mockTests);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", category: "Haematology", sample: "Blood", unit: "", normalRange: "", tat: "2h" });

  const filtered = tests.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  const handleAdd = () => {
    setTests([...tests, { ...form, id: Date.now().toString(), active: true }]);
    setShowAdd(false);
    setForm({ name: "", code: "", category: "Haematology", sample: "Blood", unit: "", normalRange: "", tat: "2h" });
    toast({ title: "Test added" });
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
              <SelectItem value="Haematology">Haematology</SelectItem>
              <SelectItem value="Biochemistry">Biochemistry</SelectItem>
              <SelectItem value="Pathology">Pathology</SelectItem>
              <SelectItem value="Microbiology">Microbiology</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1"><Plus size={14} /> Add Test</Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Test Name</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Code</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Category</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Sample</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Normal Range</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">TAT</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Active</th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-foreground">{t.name}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline">{t.code}</Badge></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.category}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.sample}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.normalRange}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.tat}</td>
                  <td className="px-3 py-2.5"><Switch checked={t.active} onCheckedChange={(v) => setTests(tests.map((x) => x.id === t.id ? { ...x, active: v } : x))} /></td>
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
            <div><Label>Test Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sample Type</Label><Input value={form.sample} onChange={(e) => setForm({ ...form, sample: e.target.value })} className="mt-1" /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Normal Range</Label><Input value={form.normalRange} onChange={(e) => setForm({ ...form, normalRange: e.target.value })} className="mt-1" /></div>
              <div><Label>TAT</Label><Input value={form.tat} onChange={(e) => setForm({ ...form, tat: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd}>Save Test</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageWrapper>
  );
};

export default SettingsLabTestsPage;
