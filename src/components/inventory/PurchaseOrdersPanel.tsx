import React, { useState, useEffect } from "react";
import { Plus, Check, Send, AlertTriangle, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-sky-100 text-sky-700",
  sent: "bg-indigo-100 text-indigo-700",
  partial_grn: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const PurchaseOrdersPanel: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [reorderMap, setReorderMap] = useState<Record<string, number>>({});
  const [newPO, setNewPO] = useState({ vendor_id: "", expected_delivery: "", notes: "" });
  const [newItems, setNewItems] = useState<{ item_id: string; quantity: number; unit_rate: number; gst_percent: number }[]>([]);
  const [itemSearch, setItemSearch] = useState("");

  const loadOrders = async () => {
    const { data } = await (supabase as any)
      .from("purchase_orders")
      .select("*, vendors(vendor_name)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const loadMaster = async () => {
    const [vendorRes, itemRes, stockRes] = await Promise.all([
      (supabase as any).from("vendors").select("id, vendor_name").eq("is_active", true),
      (supabase as any).from("inventory_items").select("id, item_name, category, gst_percent, reorder_level").eq("is_active", true),
      (supabase as any).from("inventory_stock").select("item_id, quantity_available"),
    ]);
    setVendors(vendorRes.data || []);
    setItems(itemRes.data || []);
    const sm: Record<string, number> = {};
    const rm: Record<string, number> = {};
    (stockRes.data || []).forEach((s: any) => { sm[s.item_id] = (sm[s.item_id] || 0) + (s.quantity_available || 0); });
    (itemRes.data || []).forEach((i: any) => { rm[i.id] = i.reorder_level || 10; });
    setStockMap(sm);
    setReorderMap(rm);
  };

  useEffect(() => { loadOrders(); loadMaster(); }, []);

  const loadPoItems = async (poId: string) => {
    const { data } = await (supabase as any)
      .from("po_items")
      .select("*, inventory_items(item_name)")
      .eq("po_id", poId);
    setPoItems(data || []);
  };

  const selectPO = (po: any) => { setSelected(po); loadPoItems(po.id); };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const tabs = ["all", "draft", "approved", "sent", "completed"];

  const updatePOStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "approved") {
      const { data: userData } = await supabase.from("users").select("id").limit(1).maybeSingle();
      update.approved_by = userData?.id;
    }
    await (supabase as any).from("purchase_orders").update(update).eq("id", id);
    toast({ title: `PO ${status === "sent" ? "sent to vendor" : status}` });
    loadOrders();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  // Low stock suggestions
  const lowStockItems = items.filter((i) => (stockMap[i.id] || 0) < (reorderMap[i.id] || 10));

  const addItemRow = (itemId: string) => {
    if (newItems.find((n) => n.item_id === itemId)) return;
    const item = items.find((i) => i.id === itemId);
    setNewItems([...newItems, { item_id: itemId, quantity: (reorderMap[itemId] || 10) * 2, unit_rate: 0, gst_percent: item?.gst_percent || 12 }]);
    setItemSearch("");
  };

  const submitNewPO = async () => {
    if (!newPO.vendor_id || newItems.length === 0) {
      toast({ title: "Select vendor and add items", variant: "destructive" });
      return;
    }
    const { data: userData } = await supabase.from("users").select("id, hospital_id").limit(1).maybeSingle();
    if (!userData) return;

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;
    let subtotal = 0;
    let gstTotal = 0;
    const processedItems = newItems.map((ni) => {
      const amt = ni.quantity * ni.unit_rate;
      const gst = amt * (ni.gst_percent / 100);
      subtotal += amt;
      gstTotal += gst;
      return { ...ni, total_amount: amt + gst };
    });

    const { data: po, error } = await (supabase as any).from("purchase_orders").insert({
      hospital_id: userData.hospital_id,
      po_number: poNumber,
      vendor_id: newPO.vendor_id,
      expected_delivery: newPO.expected_delivery || null,
      notes: newPO.notes || null,
      total_amount: subtotal,
      gst_amount: gstTotal,
      net_amount: subtotal + gstTotal,
      created_by: userData.id,
      status: "draft",
    }).select().maybeSingle();

    if (error || !po) { toast({ title: "Failed to create PO", variant: "destructive" }); return; }

    for (const pi of processedItems) {
      await (supabase as any).from("po_items").insert({
        hospital_id: userData.hospital_id,
        po_id: po.id,
        item_id: pi.item_id,
        quantity_ordered: pi.quantity,
        unit_rate: pi.unit_rate,
        gst_percent: pi.gst_percent,
        total_amount: pi.total_amount,
      });
    }

    toast({ title: `PO ${poNumber} created` });
    setShowNew(false);
    setNewPO({ vendor_id: "", expected_delivery: "", notes: "" });
    setNewItems([]);
    loadOrders();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* LEFT — PO List */}
      <div className="w-[320px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-card border-b border-border px-3 py-2 flex items-center gap-1.5 flex-wrap">
          {tabs.map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-colors", filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {t === "all" ? `All (${orders.length})` : `${t} (${orders.filter((o) => o.status === t).length})`}
            </button>
          ))}
        </div>
        <div className="flex-shrink-0 px-3 py-2 border-b border-border">
          <Button size="sm" className="w-full text-xs gap-1.5" onClick={() => setShowNew(true)}>
            <Plus className="h-3 w-3" /> New PO
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map((po) => (
            <div
              key={po.id}
              onClick={() => selectPO(po)}
              className={cn(
                "px-4 py-3 border-b border-border/50 cursor-pointer transition-colors",
                selected?.id === po.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">{po.po_number}</p>
                  <p className="text-xs font-semibold text-foreground">{po.vendors?.vendor_name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">₹{(po.net_amount || 0).toLocaleString("en-IN")} • {po.po_date}</p>
                </div>
                <span className={cn("text-[9px] px-2 py-0.5 rounded-full capitalize font-medium", statusColors[po.status])}>
                  {po.status?.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-xs">No POs found.</div>
          )}
        </div>
      </div>

      {/* RIGHT — PO Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex-shrink-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{selected.po_number}</p>
                <p className="text-[10px] text-muted-foreground">{selected.vendors?.vendor_name} • Expected: {selected.expected_delivery || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full capitalize font-medium", statusColors[selected.status])}>
                  {selected.status?.replace("_", " ")}
                </span>
                {selected.status === "draft" && (
                  <Button size="sm" className="text-[10px] h-6 gap-1" onClick={() => updatePOStatus(selected.id, "approved")}>
                    <Check className="h-3 w-3" /> Approve
                  </Button>
                )}
                {selected.status === "approved" && (
                  <Button size="sm" className="text-[10px] h-6 gap-1" onClick={() => updatePOStatus(selected.id, "sent")}>
                    <Send className="h-3 w-3" /> Send to Vendor
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Item</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Rate</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">GST%</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-4 py-2 font-medium text-foreground">{item.inventory_items?.item_name || "—"}</td>
                      <td className="px-3 py-2 text-right">{item.quantity_ordered}</td>
                      <td className="px-3 py-2 text-right">₹{(item.unit_rate || 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right">{item.gst_percent}%</td>
                      <td className="px-3 py-2 text-right font-semibold">₹{(item.total_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity_received || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex-shrink-0 border-t border-border bg-card px-4 py-2.5 flex items-center justify-end gap-4 text-xs">
              <span className="text-muted-foreground">Subtotal: ₹{(selected.total_amount || 0).toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">GST: ₹{(selected.gst_amount || 0).toLocaleString("en-IN")}</span>
              <span className="font-bold text-foreground">Total: ₹{(selected.net_amount || 0).toLocaleString("en-IN")}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            Select a PO to view details
          </div>
        )}
      </div>

      {/* New PO Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle className="text-sm">Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={newPO.vendor_id} onValueChange={(v) => setNewPO({ ...newPO, vendor_id: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id} className="text-xs">{v.vendor_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={newPO.expected_delivery} onChange={(e) => setNewPO({ ...newPO, expected_delivery: e.target.value })} className="h-8 text-xs" placeholder="Expected Delivery" />
              <Input placeholder="Notes" value={newPO.notes} onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })} className="h-8 text-xs" />
            </div>

            {/* Smart suggestions */}
            {lowStockItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-3 w-3" /> Low Stock Items — Suggested for PO
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lowStockItems.slice(0, 8).map((i) => (
                    <button key={i.id} onClick={() => addItemRow(i.id)} className={cn(
                      "text-[10px] px-2 py-1 rounded-full border transition-colors",
                      newItems.find((n) => n.item_id === i.id) ? "bg-primary/10 border-primary text-primary" : "bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
                    )}>
                      {i.item_name} ({stockMap[i.id] || 0} left)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-semibold text-foreground mb-2">PO Items</p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search items..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              {itemSearch && (
                <div className="max-h-28 overflow-auto border border-border rounded mb-2">
                  {items.filter((i) => i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) && !newItems.find((n) => n.item_id === i.id)).map((i) => (
                    <div key={i.id} onClick={() => addItemRow(i.id)} className="px-3 py-1.5 text-xs hover:bg-muted/50 cursor-pointer">{i.item_name}</div>
                  ))}
                </div>
              )}
              {newItems.map((ni, idx) => {
                const item = items.find((i) => i.id === ni.item_id);
                const lineTotal = ni.quantity * ni.unit_rate * (1 + ni.gst_percent / 100);
                return (
                  <div key={ni.item_id} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs flex-1 truncate min-w-0">{item?.item_name}</span>
                    <Input type="number" min={1} value={ni.quantity} onChange={(e) => { const c = [...newItems]; c[idx].quantity = parseInt(e.target.value) || 1; setNewItems(c); }} className="h-7 w-14 text-xs" placeholder="Qty" />
                    <Input type="number" min={0} value={ni.unit_rate} onChange={(e) => { const c = [...newItems]; c[idx].unit_rate = parseFloat(e.target.value) || 0; setNewItems(c); }} className="h-7 w-20 text-xs" placeholder="Rate" />
                    <span className="text-[10px] text-muted-foreground w-16 text-right">₹{lineTotal.toFixed(0)}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {newItems.length > 0 && (
                <div className="text-right text-xs font-bold mt-2 pt-2 border-t border-border">
                  Total: ₹{newItems.reduce((s, ni) => s + ni.quantity * ni.unit_rate * (1 + ni.gst_percent / 100), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowNew(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={submitNewPO} className="text-xs">Create PO</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrdersPanel;
