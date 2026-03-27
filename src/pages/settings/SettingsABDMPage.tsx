import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SettingsABDMPage: React.FC = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    hfrId: "", facilityName: "", clientId: "", clientSecret: "",
    abhaCreation: false, hipSharing: false, hiuFetch: false, hcxClaims: false,
  });

  const handleSave = () => { setSaving(true); setTimeout(() => { toast({ title: "ABDM config saved" }); setSaving(false); }, 500); };

  const features = [
    { key: "abhaCreation" as const, label: "ABHA ID creation at registration", desc: "Create ABHA IDs during patient registration" },
    { key: "hipSharing" as const, label: "Health record sharing (HIP)", desc: "Share patient records via ABDM network" },
    { key: "hiuFetch" as const, label: "Fetch patient records (HIU)", desc: "Retrieve records from other facilities" },
    { key: "hcxClaims" as const, label: "HCX claims (NHCX)", desc: "Submit claims via Health Claims Exchange" },
  ];

  return (
    <SettingsPageWrapper title="ABDM / ABHA" onSave={handleSave} saving={saving}>
      <p className="text-sm text-muted-foreground mb-6">Connect to Ayushman Bharat Digital Mission for ABHA ID creation and health record sharing.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Facility Details</h2>
          <div className="space-y-3">
            <div><Label>HFR (Health Facility Registry) ID</Label><Input value={config.hfrId} onChange={(e) => setConfig({ ...config, hfrId: e.target.value })} className="mt-1" /></div>
            <div><Label>Facility Name (as per HFR)</Label><Input value={config.facilityName} onChange={(e) => setConfig({ ...config, facilityName: e.target.value })} className="mt-1" /></div>
            <div><Label>ABDM Client ID</Label><Input value={config.clientId} onChange={(e) => setConfig({ ...config, clientId: e.target.value })} className="mt-1" /></div>
            <div><Label>ABDM Client Secret</Label><Input type="password" value={config.clientSecret} onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })} className="mt-1" /></div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Features</h2>
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.key} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label>{f.label}</Label>
                    <Badge variant={config[f.key] ? "default" : "secondary"} className="text-[10px]">
                      {config[f.key] ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
                <Switch checked={config[f.key]} onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })} />
              </div>
            ))}
          </div>
        </section>

        <Button variant="outline">Test ABDM Connection</Button>
      </div>
    </SettingsPageWrapper>
  );
};

export default SettingsABDMPage;
