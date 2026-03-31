import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";

const HOSPITAL_ID = "8f3d08b3-8835-42a7-920e-fdf5a78260bc";

export default function CorporateTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_person: "", contact_phone: "", contact_email: "", gstin: "", credit_days: 30, negotiated_rate_percent: 0 });

  const load = async () => {
    const { data } = await supabase.from("corporate_accounts").select("*").eq("hospital_id", HOSPITAL_ID).eq("is_active", true).order("company_name");
    setAccounts(data || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name required"); return; }
    const { error } = await supabase.from("corporate_accounts").insert({
      hospital_id: HOSPITAL_ID, ...form,
    });
    if (error) { console.error("Corporate account insert error:", error); toast.error(error.message || "Failed to add account"); return; }
    toast.success("Corporate account added");
    setShowAdd(false);
    setForm({ company_name: "", contact_person: "", contact_phone: "", contact_email: "", gstin: "", credit_days: 30, negotiated_rate_percent: 0 });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Corporate Accounts</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Corporate Account</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Credit Days</TableHead>
              <TableHead>Discount %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.company_name}</TableCell>
                <TableCell>{a.contact_person || "—"}</TableCell>
                <TableCell>{a.contact_phone || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{a.gstin || "—"}</TableCell>
                <TableCell>{a.credit_days}</TableCell>
                <TableCell>{a.negotiated_rate_percent}%</TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No corporate accounts</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Corporate Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div><Label>Credit Days</Label><Input type="number" value={form.credit_days} onChange={(e) => setForm({ ...form, credit_days: +e.target.value })} /></div>
            <div><Label>Discount %</Label><Input type="number" value={form.negotiated_rate_percent} onChange={(e) => setForm({ ...form, negotiated_rate_percent: +e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
