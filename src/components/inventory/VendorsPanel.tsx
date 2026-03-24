import React, { useState, useEffect } from "react";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const VendorsPanel: React.FC = () => {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vendor_name: "", vendor_code: "", gstin: "", contact_name: "", contact_phone: "", contact_email: "", address: "", credit_days: "30" });

  const loadVendors = async () => {
    const { data } = await (supabase as any).from("vendors").select("*").eq("is_active", true).order("vendor_name");
    setVendors(data || []);
  };

  useEffect(() => { loadVendors(); }, []);

  const filtered = vendors.filter((v) => v.vendor_name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!form.vendor_name) { toast({ title: "Vendor name required", variant: "destructive" }); return; }
    const { data: userData } = await supabase.from("users").select("hospital_id").limit(1).single();
    if (!userData) return;

    await (supabase as any).from("vendors").insert({
      hospital_id: userData.hospital_id,
      ...form,
      credit_days: parseInt(form.credit_days) || 30,
    });
    toast({ title: "Vendor added" });
    setShowAdd(false);
    setForm({ vendor_name: "", vendor_code: "", gstin: "", contact_name: "", contact_phone: "", contact_email: "", address: "", credit_days: "30" });
    loadVendors();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-shrink-0 bg-card border-b border-border px-4 py-2.5 flex items-center gap-3">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Button size="sm" className="ml-auto text-xs gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-3 w-3" /> Add Vendor
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((v) => (
          <div key={v.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                {v.vendor_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{v.vendor_name}</h4>
                {v.vendor_code && <p className="text-[10px] text-muted-foreground font-mono">{v.vendor_code}</p>}
                {v.gstin && <p className="text-[10px] text-muted-foreground">GSTIN: {v.gstin}</p>}
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {v.contact_name && <p className="text-xs text-muted-foreground">{v.contact_name}</p>}
              {v.contact_phone && (
                <a href={`tel:${v.contact_phone}`} className="text-xs text-primary flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {v.contact_phone}
                </a>
              )}
              {v.contact_email && (
                <a href={`mailto:${v.contact_email}`} className="text-xs text-primary flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {v.contact_email}
                </a>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Credit: {v.credit_days} days</span>
              <span>•</span>
              <span>Score: {v.performance_score}/100</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">No vendors found. Add your first vendor.</div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Add Vendor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Vendor Name *" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="h-8 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Vendor Code" value={form.vendor_code} onChange={(e) => setForm({ ...form, vendor_code: e.target.value })} className="h-8 text-xs" />
              <Input placeholder="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="h-8 text-xs" />
            </div>
            <Input placeholder="Contact Person" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="h-8 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="h-8 text-xs" />
              <Input placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="h-8 text-xs" />
            </div>
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Credit Days" type="number" value={form.credit_days} onChange={(e) => setForm({ ...form, credit_days: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleAdd} className="text-xs">Add Vendor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorsPanel;
