import React, { useState, useEffect, useMemo } from "react";
import { Brain, AlertTriangle, Zap, FileText, Loader2, Settings as SettingsIcon, CheckCircle2, TrendingDown, Truck, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { sendWhatsApp } from "@/lib/whatsapp-send";
import { useHospitalId } from "@/hooks/useHospitalId";

interface VendorRate {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string | null;
  vendor_email: string | null;
  unit_price: number;
  lead_time_days: number;
  last_po_date: string | null;
}

interface PredictedItem {
  id: string;
  item_name: string;
  category: string | null;
  current_stock: number;
  reorder_level: number;
  max_stock_level: number;
  gst_percent: number;
  avg_daily_consumption: number;
  days_to_stockout: number;
  recommended_qty: number;
  vendors: VendorRate[];
  recommended_vendor_id: string | null;
}

interface ProcurementSettings {
  auto_approve_po: boolean;
  auto_approve_threshold: number;
  notify_vendor_on_approval: boolean;
  default_lead_time_days: number;
}

const DEFAULT_SETTINGS: ProcurementSettings = {
  auto_approve_po: false,
  auto_approve_threshold: 10000,
  notify_vendor_on_approval: true,
  default_lead_time_days: 7,
};

const SmartProcurementPanel: React.FC = () => {
  const { toast } = useToast();
  const { hospitalId } = useHospitalId();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [items, setItems] = useState<PredictedItem[]>([]);
  const [filter, setFilter] = useState<"all" | "red" | "amber" | "green">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ProcurementSettings>(DEFAULT_SETTINGS);
  const [hospitalName, setHospitalName] = useState<string>("");

  // ── Load hospital + settings
  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      const [{ data: h }, { data: s }] = await Promise.all([
        supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle(),
        (supabase as any).from("procurement_settings").select("*").eq("hospital_id", hospitalId).maybeSingle(),
      ]);
      if (h) setHospitalName(h.name || "");
      if (s) setSettings({
        auto_approve_po: !!s.auto_approve_po,
        auto_approve_threshold: Number(s.auto_approve_threshold || 10000),
        notify_vendor_on_approval: !!s.notify_vendor_on_approval,
        default_lead_time_days: s.default_lead_time_days || 7,
      });
    })();
  }, [hospitalId]);

  // ── Load + compute predicted stockouts
  const loadPredictions = async () => {
    if (!hospitalId) return;
    setLoading(true);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const [itemsRes, stockRes, vendorItemsRes, vendorsRes, poItemsRes, posRes] = await Promise.all([
      (supabase as any).from("inventory_items")
        .select("id, item_name, category, reorder_level, max_stock_level, gst_percent")
        .eq("hospital_id", hospitalId).eq("is_active", true),
      (supabase as any).from("inventory_stock").select("item_id, quantity_available").eq("hospital_id", hospitalId),
      (supabase as any).from("vendor_items").select("*").eq("hospital_id", hospitalId),
      (supabase as any).from("vendors")
        .select("id, vendor_name, contact_phone, contact_email")
        .eq("hospital_id", hospitalId).eq("is_active", true),
      (supabase as any).from("po_items").select("item_id, quantity_received, po_id").eq("hospital_id", hospitalId),
      (supabase as any).from("purchase_orders").select("id, po_date").eq("hospital_id", hospitalId).gte("po_date", ninetyDaysAgo),
    ]);

    const allItems = itemsRes.data || [];
    const stockMap: Record<string, number> = {};
    (stockRes.data || []).forEach((s: any) => {
      stockMap[s.item_id] = (stockMap[s.item_id] || 0) + (s.quantity_available || 0);
    });

    // ── Estimate avg daily consumption from PO receipts in last 90d
    const recentPoIds = new Set((posRes.data || []).map((p: any) => p.id));
    const consumedMap: Record<string, number> = {};
    (poItemsRes.data || []).forEach((pi: any) => {
      if (recentPoIds.has(pi.po_id)) {
        consumedMap[pi.item_id] = (consumedMap[pi.item_id] || 0) + (pi.quantity_received || 0);
      }
    });

    // ── Vendor lookup
    const vendorMap: Record<string, any> = {};
    (vendorsRes.data || []).forEach((v: any) => { vendorMap[v.id] = v; });

    const vendorItemsByItem: Record<string, VendorRate[]> = {};
    (vendorItemsRes.data || []).forEach((vi: any) => {
      const v = vendorMap[vi.vendor_id];
      if (!v) return;
      (vendorItemsByItem[vi.item_id] ||= []).push({
        vendor_id: vi.vendor_id,
        vendor_name: v.vendor_name,
        vendor_phone: v.contact_phone,
        vendor_email: v.contact_email,
        unit_price: Number(vi.unit_price || 0),
        lead_time_days: vi.lead_time_days || settings.default_lead_time_days,
        last_po_date: vi.last_po_date,
      });
    });

    // ── Filter to items at/below reorder level and compute predictions
    const predicted: PredictedItem[] = allItems
      .filter((i: any) => (stockMap[i.id] || 0) <= (i.reorder_level || 0))
      .map((i: any) => {
        const stock = stockMap[i.id] || 0;
        const consumed90d = consumedMap[i.id] || 0;
        const avgDaily = consumed90d > 0 ? consumed90d / 90 : Math.max((i.reorder_level || 10) / 30, 0.1);
        const days = avgDaily > 0 ? stock / avgDaily : 999;
        const vendors = vendorItemsByItem[i.id] || [];
        // AI recommendation: weighted score (price 60%, lead time 40%) — lower is better
        let recommended: string | null = null;
        if (vendors.length > 0) {
          const minPrice = Math.min(...vendors.map((v) => v.unit_price || 0.01));
          const minLead = Math.min(...vendors.map((v) => v.lead_time_days || 1));
          const scored = vendors.map((v) => ({
            id: v.vendor_id,
            score: 0.6 * ((v.unit_price || minPrice) / minPrice) + 0.4 * ((v.lead_time_days || minLead) / minLead),
          }));
          scored.sort((a, b) => a.score - b.score);
          recommended = scored[0].id;
        }
        return {
          id: i.id,
          item_name: i.item_name,
          category: i.category,
          current_stock: stock,
          reorder_level: i.reorder_level || 0,
          max_stock_level: i.max_stock_level || (i.reorder_level || 10) * 3,
          gst_percent: Number(i.gst_percent || 12),
          avg_daily_consumption: Math.round(avgDaily * 10) / 10,
          days_to_stockout: Math.round(days),
          recommended_qty: Math.max((i.max_stock_level || (i.reorder_level || 10) * 3) - stock, 1),
          vendors,
          recommended_vendor_id: recommended,
        };
      })
      .sort((a, b) => a.days_to_stockout - b.days_to_stockout);

    setItems(predicted);
    setLoading(false);
  };

  useEffect(() => { if (hospitalId) loadPredictions(); }, [hospitalId]);

  // ── Filtered view
  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "red") return items.filter((i) => i.days_to_stockout < 3);
    if (filter === "amber") return items.filter((i) => i.days_to_stockout >= 3 && i.days_to_stockout <= 7);
    return items.filter((i) => i.days_to_stockout > 7 && i.days_to_stockout <= 14);
  }, [items, filter]);

  const counts = useMemo(() => ({
    red: items.filter((i) => i.days_to_stockout < 3).length,
    amber: items.filter((i) => i.days_to_stockout >= 3 && i.days_to_stockout <= 7).length,
    green: items.filter((i) => i.days_to_stockout > 7 && i.days_to_stockout <= 14).length,
  }), [items]);

  // ── Save settings
  const saveSettings = async () => {
    if (!hospitalId) return;
    const { error } = await (supabase as any).from("procurement_settings").upsert({
      hospital_id: hospitalId,
      ...settings,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } else {
      toast({ title: "Procurement settings saved" });
      setShowSettings(false);
    }
  };

  // ── Generate PO for one item
  const generatePO = async (item: PredictedItem, vendorIdOverride?: string): Promise<{ ok: boolean; poNumber?: string }> => {
    if (!hospitalId) return { ok: false };
    const vendorId = vendorIdOverride || item.recommended_vendor_id;
    if (!vendorId) {
      toast({ title: `No vendor configured for ${item.item_name}`, variant: "destructive" });
      return { ok: false };
    }
    const vendor = item.vendors.find((v) => v.vendor_id === vendorId);
    if (!vendor) return { ok: false };

    const qty = item.recommended_qty;
    const subtotal = qty * vendor.unit_price;
    const gst = subtotal * (item.gst_percent / 100);
    const net = subtotal + gst;

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const expectedDelivery = new Date(Date.now() + (vendor.lead_time_days || 7) * 86400000).toISOString().slice(0, 10);

    const autoApprove = settings.auto_approve_po && net <= settings.auto_approve_threshold;

    const { data: userRow } = await supabase.from("users").select("id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle();

    const { data: po, error } = await (supabase as any).from("purchase_orders").insert({
      hospital_id: hospitalId,
      po_number: poNumber,
      vendor_id: vendorId,
      po_date: new Date().toISOString().slice(0, 10),
      expected_delivery: expectedDelivery,
      status: autoApprove ? "approved" : "draft",
      total_amount: subtotal,
      gst_amount: gst,
      net_amount: net,
      notes: `Auto-generated by Smart Procurement (${item.days_to_stockout}d to stockout)`,
      created_by: userRow?.id,
      approved_by: autoApprove ? userRow?.id : null,
    }).select().maybeSingle();

    if (error || !po) {
      toast({ title: `Failed to create PO for ${item.item_name}`, variant: "destructive" });
      return { ok: false };
    }

    await (supabase as any).from("po_items").insert({
      hospital_id: hospitalId,
      po_id: po.id,
      item_id: item.id,
      quantity_ordered: qty,
      unit_rate: vendor.unit_price,
      gst_percent: item.gst_percent,
      total_amount: subtotal + gst,
    });

    // Update vendor_items.last_po_date
    await (supabase as any).from("vendor_items")
      .update({ last_po_date: new Date().toISOString().slice(0, 10) })
      .eq("hospital_id", hospitalId).eq("vendor_id", vendorId).eq("item_id", item.id);

    // Notify vendor on approval
    if (autoApprove && settings.notify_vendor_on_approval && vendor.vendor_phone) {
      const message = `Dear ${vendor.vendor_name}, a Purchase Order ${poNumber} has been raised for ${item.item_name} × ${qty} @ ₹${vendor.unit_price}. Please confirm delivery by ${expectedDelivery}. — ${hospitalName}`;
      try {
        await sendWhatsApp({ hospitalId, phone: vendor.vendor_phone, message });
      } catch { /* non-fatal */ }
    }

    return { ok: true, poNumber };
  };

  const handleGeneratePO = async (item: PredictedItem) => {
    setGenerating(item.id);
    const res = await generatePO(item);
    setGenerating(null);
    if (res.ok) {
      toast({ title: `PO ${res.poNumber} created`, description: settings.auto_approve_po ? "Auto-approved & vendor notified" : "Saved as draft for approval" });
      loadPredictions();
    }
  };

  const handleGenerateAll = async () => {
    const redItems = items.filter((i) => i.days_to_stockout < 3 && i.recommended_vendor_id);
    if (redItems.length === 0) {
      toast({ title: "No critical items with vendor configured" });
      return;
    }
    setBulkGenerating(true);
    let created = 0;
    for (const item of redItems) {
      const res = await generatePO(item);
      if (res.ok) created++;
    }
    setBulkGenerating(false);
    toast({ title: `${created} POs generated for critical items` });
    loadPredictions();
  };

  // ── Row colour helper
  const rowColor = (days: number) => {
    if (days < 3) return "border-l-destructive bg-destructive/5";
    if (days <= 7) return "border-l-amber-500 bg-amber-50/40";
    return "border-l-emerald-500 bg-emerald-50/30";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">Smart Procurement</p>
            <p className="text-[11px] text-muted-foreground">AI-driven stockout prediction & auto-PO generation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowSettings(true)}>
            <SettingsIcon className="h-3 w-3" /> Settings
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleGenerateAll}
            disabled={bulkGenerating || counts.red === 0}
          >
            {bulkGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Generate All Critical ({counts.red})
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="flex-shrink-0 px-5 py-2.5 border-b border-border bg-muted/20 flex items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="h-7">
            <TabsTrigger value="all" className="text-[11px] h-6 px-2.5">All ({items.length})</TabsTrigger>
            <TabsTrigger value="red" className="text-[11px] h-6 px-2.5 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              🔴 Critical &lt;3d ({counts.red})
            </TabsTrigger>
            <TabsTrigger value="amber" className="text-[11px] h-6 px-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              🟡 3-7d ({counts.amber})
            </TabsTrigger>
            <TabsTrigger value="green" className="text-[11px] h-6 px-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              🟢 7-14d ({counts.green})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {settings.auto_approve_po ? (
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              Auto-approve ON ≤ ₹{settings.auto_approve_threshold.toLocaleString("en-IN")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Manual approval</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
            <p className="text-sm font-medium text-foreground">All stock levels healthy</p>
            <p className="text-xs text-muted-foreground mt-1">No items currently below reorder level for the selected window.</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {filteredItems.map((item) => {
              const recVendor = item.vendors.find((v) => v.vendor_id === item.recommended_vendor_id);
              const cheapestPrice = item.vendors.length > 0 ? Math.min(...item.vendors.map((v) => v.unit_price)) : 0;
              const fastestLead = item.vendors.length > 0 ? Math.min(...item.vendors.map((v) => v.lead_time_days)) : 0;
              return (
                <div key={item.id} className={cn("border-l-4 border border-border rounded-lg p-4", rowColor(item.days_to_stockout))}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">{item.item_name}</h3>
                        {item.category && <Badge variant="outline" className="text-[9px]">{item.category}</Badge>}
                        <Badge className={cn("text-[10px]",
                          item.days_to_stockout < 3 ? "bg-destructive text-destructive-foreground" :
                          item.days_to_stockout <= 7 ? "bg-amber-500 text-white" :
                          "bg-emerald-600 text-white"
                        )}>
                          <TrendingDown className="h-2.5 w-2.5 mr-1" />
                          {item.days_to_stockout > 365 ? "—" : `${item.days_to_stockout}d to stockout`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
                        <span>Stock: <b className="text-foreground">{item.current_stock}</b></span>
                        <span>Reorder: {item.reorder_level}</span>
                        <span>Daily use: ~{item.avg_daily_consumption}</span>
                        <span>Recommend qty: <b className="text-primary">{item.recommended_qty}</b></span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 flex-shrink-0"
                      disabled={!item.recommended_vendor_id || generating === item.id}
                      onClick={() => handleGeneratePO(item)}
                    >
                      {generating === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                      Generate PO
                    </Button>
                  </div>

                  {/* Vendor comparison */}
                  {item.vendors.length === 0 ? (
                    <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      No approved vendors configured for this item. Add vendor rates in the Vendors tab.
                    </div>
                  ) : (
                    <div className="mt-3">
                      {recVendor && (
                        <div className="flex items-center gap-2 mb-2 text-[11px]">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="font-medium text-primary">AI Recommends: {recVendor.vendor_name}</span>
                          <span className="text-muted-foreground">— Best balance of price &amp; lead time</span>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/50">
                              <th className="text-left py-1.5 font-medium">Vendor</th>
                              <th className="text-right py-1.5 font-medium">Rate</th>
                              <th className="text-right py-1.5 font-medium">Lead Time</th>
                              <th className="text-right py-1.5 font-medium">Last Order</th>
                              <th className="text-right py-1.5 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.vendors.map((v) => {
                              const isCheapest = v.unit_price === cheapestPrice;
                              const isFastest = v.lead_time_days === fastestLead;
                              const isAi = v.vendor_id === item.recommended_vendor_id;
                              return (
                                <tr key={v.vendor_id} className="border-b border-border/30">
                                  <td className="py-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-foreground">{v.vendor_name}</span>
                                      {isAi && <Badge className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/30 border">AI</Badge>}
                                    </div>
                                  </td>
                                  <td className={cn("text-right py-1.5 tabular-nums", isCheapest && "text-emerald-700 font-semibold")}>
                                    <span className="inline-flex items-center gap-0.5">
                                      <IndianRupee className="h-2.5 w-2.5" />{v.unit_price.toLocaleString("en-IN")}
                                      {isCheapest && <Badge className="text-[8px] h-3.5 px-1 ml-1 bg-emerald-100 text-emerald-700 border-0">cheapest</Badge>}
                                    </span>
                                  </td>
                                  <td className={cn("text-right py-1.5 tabular-nums", isFastest && "text-sky-700 font-semibold")}>
                                    <span className="inline-flex items-center gap-1">
                                      <Truck className="h-2.5 w-2.5" />{v.lead_time_days}d
                                      {isFastest && <Badge className="text-[8px] h-3.5 px-1 ml-1 bg-sky-100 text-sky-700 border-0">fastest</Badge>}
                                    </span>
                                  </td>
                                  <td className="text-right py-1.5 text-muted-foreground tabular-nums">{v.last_po_date || "—"}</td>
                                  <td className="text-right py-1.5">
                                    {!isAi && (
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-5 text-[10px] px-2"
                                        disabled={generating === item.id}
                                        onClick={() => { setGenerating(item.id); generatePO(item, v.vendor_id).then((r) => { setGenerating(null); if (r.ok) { toast({ title: `PO ${r.poNumber} created` }); loadPredictions(); } }); }}
                                      >
                                        Use this vendor
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Procurement Settings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded border border-border">
              <div>
                <Label className="text-xs font-medium">Auto-approve POs</Label>
                <p className="text-[10px] text-muted-foreground">Skip manual approval for POs under threshold</p>
              </div>
              <Switch
                checked={settings.auto_approve_po}
                onCheckedChange={(c) => setSettings({ ...settings, auto_approve_po: c })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auto-approve threshold (₹)</Label>
              <Input
                type="number" min={0}
                value={settings.auto_approve_threshold}
                onChange={(e) => setSettings({ ...settings, auto_approve_threshold: parseFloat(e.target.value) || 0 })}
                disabled={!settings.auto_approve_po}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">POs ≤ this amount will be approved automatically</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded border border-border">
              <div>
                <Label className="text-xs font-medium">Notify vendor on approval</Label>
                <p className="text-[10px] text-muted-foreground">Send WhatsApp message when PO is approved</p>
              </div>
              <Switch
                checked={settings.notify_vendor_on_approval}
                onCheckedChange={(c) => setSettings({ ...settings, notify_vendor_on_approval: c })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default lead time (days)</Label>
              <Input
                type="number" min={1}
                value={settings.default_lead_time_days}
                onChange={(e) => setSettings({ ...settings, default_lead_time_days: parseInt(e.target.value) || 7 })}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={saveSettings} className="text-xs">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartProcurementPanel;
