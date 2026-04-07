import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus } from "lucide-react";

interface TPA {
  id: string;
  tpa_name: string;
  tpa_code: string | null;
  coordinator_name: string | null;
  coordinator_phone: string | null;
  claims_email: string | null;
  credit_days: number;
  submission_method: string;
  required_documents: string[];
  is_active: boolean;
}

const defaultDocs = [
  "Admission letter", "Investigation reports", "Pre-auth form",
  "Policy card copy", "Discharge summary", "Claim form",
  "Aadhar copy", "Referral letter", "PMJAY card", "CGHS card", "ECHS card",
];

const TPAConfiguration: React.FC = () => {
  const [tpas, setTpas] = useState<TPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TPA | null>(null);
  const [form, setForm] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("tpa_config").select("*").order("tpa_name");
    setTpas((data || []) as TPA[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ tpa_name: "", tpa_code: "", coordinator_name: "", coordinator_phone: "", claims_email: "", credit_days: 45, submission_method: "portal", required_documents: [], is_active: true });
    setDrawerOpen(true);
  };

  const openEdit = (tpa: TPA) => {
    setEditing(tpa);
    setForm({ ...tpa });
    setDrawerOpen(true);
  };

  const save = async () => {
    const { data: userData } = await supabase.from("users").select("hospital_id").limit(1).maybeSingle();
    if (!userData) return;

    const payload = {
      hospital_id: userData.hospital_id,
      tpa_name: form.tpa_name,
      tpa_code: form.tpa_code || null,
      coordinator_name: form.coordinator_name || null,
      coordinator_phone: form.coordinator_phone || null,
      claims_email: form.claims_email || null,
      credit_days: Number(form.credit_days) || 45,
      submission_method: form.submission_method,
      required_documents: form.required_documents || [],
      is_active: form.is_active,
    };

    if (editing) {
      await supabase.from("tpa_config").update(payload).eq("id", editing.id);
      toast({ title: "TPA updated ✓" });
    } else {
      await supabase.from("tpa_config").insert(payload);
      toast({ title: "TPA added ✓" });
    }
    setDrawerOpen(false);
    loadData();
  };

  const toggleDoc = (doc: string) => {
    const docs = form.required_documents || [];
    setForm({
      ...form,
      required_documents: docs.includes(doc) ? docs.filter((d: string) => d !== doc) : [...docs, doc],
    });
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold">TPA Configuration</h3>
        <Button size="sm" className="gap-1.5 text-[12px]" onClick={openNew}><Plus size={14} /> Add TPA</Button>
      </div>

      <div className="bg-background rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">TPA Name</TableHead>
              <TableHead className="text-[11px]">Code</TableHead>
              <TableHead className="text-[11px]">Coordinator</TableHead>
              <TableHead className="text-[11px]">Credit Days</TableHead>
              <TableHead className="text-[11px]">Method</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : tpas.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-[13px] font-medium">{t.tpa_name}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{t.tpa_code || "—"}</TableCell>
                <TableCell className="text-xs">{t.coordinator_name || "—"}</TableCell>
                <TableCell className="text-xs tabular-nums">{t.credit_days}</TableCell>
                <TableCell className="text-xs capitalize">{t.submission_method}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${t.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-[11px] h-7" onClick={() => openEdit(t)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit TPA" : "Add TPA"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">TPA Name *</Label>
              <Input className="mt-1" value={form.tpa_name || ""} onChange={e => setForm({ ...form, tpa_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">TPA Code</Label>
              <Input className="mt-1" value={form.tpa_code || ""} onChange={e => setForm({ ...form, tpa_code: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Coordinator Name</Label>
                <Input className="mt-1" value={form.coordinator_name || ""} onChange={e => setForm({ ...form, coordinator_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Phone</Label>
                <Input className="mt-1" value={form.coordinator_phone || ""} onChange={e => setForm({ ...form, coordinator_phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Claims Email</Label>
              <Input className="mt-1" type="email" value={form.claims_email || ""} onChange={e => setForm({ ...form, claims_email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Credit Days</Label>
                <Input className="mt-1" type="number" value={form.credit_days || 45} onChange={e => setForm({ ...form, credit_days: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Submission Method</Label>
                <Select value={form.submission_method || "portal"} onValueChange={v => setForm({ ...form, submission_method: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="hcx">HCX</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground font-semibold mb-2 block">Required Documents</Label>
              <div className="space-y-1.5">
                {defaultDocs.map(doc => (
                  <label key={doc} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded" checked={(form.required_documents || []).includes(doc)} onChange={() => toggleDoc(doc)} />
                    {doc}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-sm">Active</Label>
            </div>
            <Button className="w-full mt-4" onClick={save}>{editing ? "Update TPA" : "Add TPA"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TPAConfiguration;
