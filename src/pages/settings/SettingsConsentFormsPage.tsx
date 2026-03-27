import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const defaultForms = [
  { id: "1", name: "General Consent for Treatment", type: "General", witness: false, active: true, content: "I hereby consent to treatment..." },
  { id: "2", name: "Surgical/Procedure Consent", type: "Surgical", witness: true, active: true, content: "I consent to the surgical procedure..." },
  { id: "3", name: "Anaesthesia Consent", type: "Anaesthesia", witness: true, active: true, content: "I understand the risks of anaesthesia..." },
  { id: "4", name: "Blood Transfusion Consent", type: "Transfusion", witness: true, active: true, content: "I consent to receive blood transfusion..." },
  { id: "5", name: "HIV Testing Consent", type: "Testing", witness: false, active: true, content: "I consent to HIV testing..." },
  { id: "6", name: "LAMA Form", type: "Discharge", witness: true, active: true, content: "I am leaving against medical advice..." },
  { id: "7", name: "DNR Order", type: "End of Life", witness: true, active: true, content: "Do not resuscitate order..." },
];

const SettingsConsentFormsPage: React.FC = () => {
  const { toast } = useToast();
  const [forms, setForms] = useState(defaultForms);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "", content: "", witness: false });

  const openEdit = (f: typeof defaultForms[0]) => {
    setEditId(f.id);
    setForm({ name: f.name, type: f.type, content: f.content, witness: f.witness });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editId) {
      setForms(forms.map((f) => f.id === editId ? { ...f, ...form } : f));
    } else {
      setForms([...forms, { id: Date.now().toString(), ...form, active: true }]);
    }
    setShowModal(false);
    setEditId(null);
    setForm({ name: "", type: "", content: "", witness: false });
    toast({ title: editId ? "Consent form updated" : "Consent form added" });
  };

  return (
    <SettingsPageWrapper title="Consent Forms" hideSave>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Manage consent form templates used across the hospital.</p>
          <Button size="sm" onClick={() => { setEditId(null); setForm({ name: "", type: "", content: "", witness: false }); setShowModal(true); }} className="gap-1"><Plus size={14} /> Add Consent Form</Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Form Name</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Witness</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Active</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium text-foreground">{f.name}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline">{f.type}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.witness ? "Yes" : "No"}</td>
                  <td className="px-4 py-2.5"><Switch checked={f.active} onCheckedChange={(v) => setForms(forms.map((x) => x.id === f.id ? { ...x, active: v } : x))} /></td>
                  <td className="px-4 py-2.5 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Eye size={13} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Consent Form</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Form Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label>Type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1" /></div>
            <div><Label>Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1" rows={6} /></div>
            <label className="flex items-center gap-2"><Switch checked={form.witness} onCheckedChange={(v) => setForm({ ...form, witness: v })} /><span className="text-sm">Requires witness signature</span></label>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageWrapper>
  );
};

export default SettingsConsentFormsPage;
