import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SettingsGSTPage: React.FC = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    gstin: "", legalName: "", tradeName: "", stateCode: "", placeOfSupply: "",
    irpUser: "", irpPassword: "", irpMode: "sandbox",
  });

  const handleSave = () => { setSaving(true); setTimeout(() => { toast({ title: "GST config saved" }); setSaving(false); }, 500); };

  return (
    <SettingsPageWrapper title="GST / NIC IRP" onSave={handleSave} saving={saving}>
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Hospital GST Details</h2>
          <div className="space-y-3">
            <div><Label>GSTIN *</Label><Input value={config.gstin} onChange={(e) => setConfig({ ...config, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" maxLength={15} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Legal Name</Label><Input value={config.legalName} onChange={(e) => setConfig({ ...config, legalName: e.target.value })} className="mt-1" /></div>
              <div><Label>Trade Name</Label><Input value={config.tradeName} onChange={(e) => setConfig({ ...config, tradeName: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>State Code</Label><Input value={config.stateCode} onChange={(e) => setConfig({ ...config, stateCode: e.target.value })} placeholder="29" maxLength={2} className="mt-1" /></div>
              <div><Label>Place of Supply</Label><Input value={config.placeOfSupply} onChange={(e) => setConfig({ ...config, placeOfSupply: e.target.value })} placeholder="Karnataka" className="mt-1" /></div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">NIC IRP (e-Invoice)</h2>
          <div className="space-y-3">
            <div><Label>IRP Username</Label><Input value={config.irpUser} onChange={(e) => setConfig({ ...config, irpUser: e.target.value })} className="mt-1" /></div>
            <div><Label>IRP Password</Label><Input type="password" value={config.irpPassword} onChange={(e) => setConfig({ ...config, irpPassword: e.target.value })} className="mt-1" /></div>
            <div>
              <Label>Mode</Label>
              <RadioGroup value={config.irpMode} onValueChange={(v) => setConfig({ ...config, irpMode: v })} className="flex gap-4 mt-1.5">
                <div className="flex items-center gap-2"><RadioGroupItem value="sandbox" id="irp-sand" /><Label htmlFor="irp-sand" className="font-normal">Sandbox</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="production" id="irp-prod" /><Label htmlFor="irp-prod" className="font-normal">Production</Label></div>
              </RadioGroup>
            </div>
            <Button variant="outline">Test IRN Generation</Button>
          </div>
        </section>

        <div className="flex items-start gap-2 bg-accent/30 border border-border rounded-lg p-4">
          <AlertTriangle size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Health services are GST exempt in India. Only non-clinical services (canteen, parking, etc.) attract GST.</p>
        </div>
      </div>
    </SettingsPageWrapper>
  );
};

export default SettingsGSTPage;
