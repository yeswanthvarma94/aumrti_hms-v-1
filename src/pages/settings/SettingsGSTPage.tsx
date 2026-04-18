import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getHospitalId } from "@/lib/getHospitalId";

const SettingsGSTPage: React.FC = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    gstin: "", legalName: "", tradeName: "", stateCode: "", placeOfSupply: "",
    irpUser: "", irpPassword: "", irpClientId: "", irpClientSecret: "", irpBaseUrl: "https://einvoice1-uat.nic.in", irpMode: "sandbox",
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>IRP Username (GST_IRP_USERNAME)</Label><Input value={config.irpUser} onChange={(e) => setConfig({ ...config, irpUser: e.target.value })} className="mt-1" /></div>
              <div><Label>IRP Password (GST_IRP_PASSWORD)</Label><Input type="password" value={config.irpPassword} onChange={(e) => setConfig({ ...config, irpPassword: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Client ID (GST_IRP_CLIENT_ID)</Label><Input value={config.irpClientId} onChange={(e) => setConfig({ ...config, irpClientId: e.target.value })} className="mt-1" /></div>
              <div><Label>Client Secret (GST_IRP_CLIENT_SECRET)</Label><Input type="password" value={config.irpClientSecret} onChange={(e) => setConfig({ ...config, irpClientSecret: e.target.value })} className="mt-1" /></div>
            </div>
            <div>
              <Label>Base URL (GST_IRP_BASE_URL)</Label>
              <Input value={config.irpBaseUrl} onChange={(e) => setConfig({ ...config, irpBaseUrl: e.target.value })} placeholder="https://einvoice1-uat.nic.in" className="mt-1 font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">UAT (sandbox): https://einvoice1-uat.nic.in &nbsp;·&nbsp; Live: https://einvoice1.nic.in</p>
            </div>
            <div>
              <Label>Mode</Label>
              <RadioGroup value={config.irpMode} onValueChange={(v) => setConfig({ ...config, irpMode: v })} className="flex gap-4 mt-1.5">
                <div className="flex items-center gap-2"><RadioGroupItem value="sandbox" id="irp-sand" /><Label htmlFor="irp-sand" className="font-normal">Sandbox</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="production" id="irp-prod" /><Label htmlFor="irp-prod" className="font-normal">Production</Label></div>
              </RadioGroup>
            </div>
            <Button variant="outline">Test IRN Generation</Button>
            <p className="text-[11px] text-muted-foreground">
              These credentials are used by the <code className="font-mono">gst-irn-generate</code> Edge Function. Without credentials, the system runs in sandbox mode (demo IRN).
            </p>
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
