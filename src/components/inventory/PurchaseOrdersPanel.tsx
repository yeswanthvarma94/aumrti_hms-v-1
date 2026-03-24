import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-primary/10 text-primary",
  sent: "bg-accent/10 text-accent-foreground",
  partial_grn: "bg-accent/10 text-accent-foreground",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const PurchaseOrdersPanel: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  const loadOrders = async () => {
    const { data } = await (supabase as any)
      .from("purchase_orders")
      .select("*, vendors(vendor_name)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => { loadOrders(); }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const tabs = ["all", "draft", "approved", "sent", "completed"];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-shrink-0 bg-card border-b border-border px-4 py-2.5 flex items-center gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={cn("px-3 py-1 rounded-full text-[10px] font-medium capitalize transition-colors", filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {t === "all" ? `All (${orders.length})` : `${t} (${orders.filter((o) => o.status === t).length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">PO #</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Vendor</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Date</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Expected</th>
              <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((po) => (
              <tr key={po.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono font-semibold text-foreground">{po.po_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{po.vendors?.vendor_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{po.po_date}</td>
                <td className="px-3 py-2 text-muted-foreground">{po.expected_delivery || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold text-foreground">₹{(po.net_amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full capitalize", statusColors[po.status] || "bg-muted text-muted-foreground")}>
                    {po.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {po.status === "draft" && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={async () => {
                      await (supabase as any).from("purchase_orders").update({ status: "approved" }).eq("id", po.id);
                      toast({ title: "PO Approved" });
                      loadOrders();
                    }}>Approve</Button>
                  )}
                  {po.status === "approved" && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={async () => {
                      await (supabase as any).from("purchase_orders").update({ status: "sent" }).eq("id", po.id);
                      toast({ title: "PO Sent to Vendor" });
                      loadOrders();
                    }}>Mark Sent</Button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No purchase orders found. Create one using "+ New PO".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrdersPanel;
