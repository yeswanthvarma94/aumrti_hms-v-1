import React, { useEffect, useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, AlertTriangle, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalId } from "@/hooks/useHospitalId";

const SERVICE_KEY = "razorpay";
const SERVICE_NAME = "Razorpay";

const SettingsRazorpayPage: React.FC = () => {
  const { toast } = useToast();
  const { hospitalId, loading: hospitalLoading } = useHospitalId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [config, setConfig] = useState({
    mode: "test",
    key_id: "",
    key_secret: "",
    webhook_secret: "",
    upi_id: "",
    part_payments: false,
    auto_receipt: true,
  });

  // Build webhook URL using the configured Supabase project
  const supabaseUrl = "https://lcemfzoangvewaahgmcz.supabase.co";
  const webhookUrl = hospitalId
    ? `${supabaseUrl}/functions/v1/razorpay-webhook?hospital_id=${hospitalId}`
    : "";

  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("api_configurations")
        .select("*")
        .eq("hospital_id", hospitalId)
        .eq("service_key", SERVICE_KEY)
        .maybeSingle();

      if (error) {
        console.error("Failed to load Razorpay config:", error);
      } else if (data) {
        setRecordId(data.id);
        const c = (data.config || {}) as Record<string, unknown>;
        setConfig({
          mode: (c.mode as string) || "test",
          key_id: (c.key_id as string) || "",
          key_secret: (c.key_secret as string) || "",
          webhook_secret: (c.webhook_secret as string) || "",
          upi_id: (c.upi_id as string) || "",
          part_payments: Boolean(c.part_payments),
          auto_receipt: c.auto_receipt !== false,
        });
        if (data.test_status === "success") setConnected(true);
        else if (data.test_status === "failed") setConnected(false);
      }
      setLoading(false);
    })();
  }, [hospitalId]);

  const testConnection = async () => {
    if (!config.key_id || !config.key_secret) {
      toast({ title: "Enter Key ID and Secret first", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      // Razorpay Basic auth ping — orders endpoint accepts GET with auth
      const auth = btoa(`${config.key_id}:${config.key_secret}`);
      const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
        headers: { Authorization: `Basic ${auth}` },
      });
      const ok = res.ok;
      setConnected(ok);
      toast({
        title: ok ? "Connection successful" : "Invalid credentials",
        description: ok ? `${config.mode === "live" ? "Live" : "Test"} mode connected` : `HTTP ${res.status}`,
        variant: ok ? "default" : "destructive",
      });
    } catch (err) {
      setConnected(false);
      toast({ title: "Connection failed", description: String(err), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!hospitalId) {
      toast({ title: "Hospital not loaded", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        hospital_id: hospitalId,
        service_key: SERVICE_KEY,
        service_name: SERVICE_NAME,
        config: { ...config },
        is_active: true,
      };

      const { error } = recordId
        ? await supabase.from("api_configurations").update(payload).eq("id", recordId)
        : await supabase.from("api_configurations").insert(payload).select("id").maybeSingle();

      if (error) throw error;
      toast({ title: "Razorpay configuration saved" });

      // Reload to get fresh ID
      if (!recordId) {
        const { data } = await supabase
          .from("api_configurations")
          .select("id")
          .eq("hospital_id", hospitalId)
          .eq("service_key", SERVICE_KEY)
          .maybeSingle();
        if (data) setRecordId(data.id);
      }
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "Webhook URL copied" });
  };

  if (hospitalLoading || loading) {
    return (
      <SettingsPageWrapper title="Razorpay Payments" hideSave>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper title="Razorpay Payments" onSave={handleSave} saving={saving}>
      <p className="text-sm text-muted-foreground mb-6">
        Configure your hospital's Razorpay credentials to accept online payments.
        Each hospital uses its own keys — credentials are scoped to your hospital only.
      </p>

      <div className="mb-6">
        {connected === true && (
          <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/30 rounded-lg px-4 py-2.5">
            <CheckCircle2 size={16} /> Connected — {config.mode === "live" ? "Live" : "Test"} Mode
          </div>
        )}
        {connected === false && (
          <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg px-4 py-2.5">
            <AlertTriangle size={16} /> Not configured or invalid credentials
          </div>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Configuration</h2>
          <div className="space-y-4">
            <div>
              <Label>Mode</Label>
              <RadioGroup
                value={config.mode}
                onValueChange={(v) => setConfig({ ...config, mode: v })}
                className="flex gap-4 mt-1.5"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="test" id="rz-test" />
                  <Label htmlFor="rz-test" className="font-normal">Test Mode</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="live" id="rz-live" />
                  <Label htmlFor="rz-live" className="font-normal">Live Mode</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Key ID</Label>
              <Input
                value={config.key_id}
                onChange={(e) => setConfig({ ...config, key_id: e.target.value })}
                placeholder={config.mode === "test" ? "rzp_test_..." : "rzp_live_..."}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <Label>Key Secret</Label>
              <div className="relative mt-1">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={config.key_secret}
                  onChange={(e) => setConfig({ ...config, key_secret: e.target.value })}
                  placeholder="Your Razorpay key secret"
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Label>Webhook Secret</Label>
              <div className="relative mt-1">
                <Input
                  type={showWebhookSecret ? "text" : "password"}
                  value={config.webhook_secret}
                  onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
                  placeholder="Webhook signing secret from Razorpay dashboard"
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Used to verify incoming webhook signatures. Required for auto-reconciliation.
              </p>
            </div>

            <div>
              <Label>UPI ID (for QR codes)</Label>
              <Input
                value={config.upi_id}
                onChange={(e) => setConfig({ ...config, upi_id: e.target.value })}
                placeholder="hospital@upi"
                className="mt-1"
              />
            </div>

            <Button variant="outline" onClick={testConnection} disabled={testing}>
              {testing ? <><Loader2 className="animate-spin mr-2" size={14} /> Testing...</> : "Test Connection"}
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Webhook Setup</h2>
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Paste this URL in your Razorpay Dashboard → Settings → Webhooks. Subscribe to <strong>payment.captured</strong> and <strong>payment_link.paid</strong> events.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded px-2 py-1.5 break-all font-mono">{webhookUrl}</code>
              <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Payment Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
              <div>
                <Label>Allow Part Payments</Label>
                <p className="text-xs text-muted-foreground">Let patients pay in installments</p>
              </div>
              <Switch
                checked={config.part_payments}
                onCheckedChange={(v) => setConfig({ ...config, part_payments: v })}
              />
            </div>
            <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
              <div>
                <Label>Auto-send Receipt</Label>
                <p className="text-xs text-muted-foreground">Send WhatsApp receipt on payment</p>
              </div>
              <Switch
                checked={config.auto_receipt}
                onCheckedChange={(v) => setConfig({ ...config, auto_receipt: v })}
              />
            </div>
          </div>
        </section>
      </div>
    </SettingsPageWrapper>
  );
};

export default SettingsRazorpayPage;
