import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const GRNPanel: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("grn_records")
        .select("*, vendors(vendor_name), users!grn_records_received_by_fkey(full_name)")
        .order("created_at", { ascending: false });
      setRecords(data || []);
    };
    load();
  }, []);

  const qcColors: Record<string, string> = {
    pass: "bg-success/10 text-success",
    fail: "bg-destructive/10 text-destructive",
    conditional: "bg-accent/10 text-accent-foreground",
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-shrink-0 bg-card border-b border-border px-4 py-2.5 flex items-center">
        <span className="text-xs font-semibold text-foreground">Goods Received Notes</span>
        <span className="ml-2 text-[10px] text-muted-foreground">({records.length} records)</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">GRN #</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Vendor</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Date</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Invoice</th>
              <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">QC</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Received By</th>
            </tr>
          </thead>
          <tbody>
            {records.map((grn) => (
              <tr key={grn.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono font-semibold text-foreground">{grn.grn_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{grn.vendors?.vendor_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{grn.grn_date}</td>
                <td className="px-3 py-2 text-muted-foreground">{grn.invoice_number || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold text-foreground">₹{(grn.total_amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full capitalize", qcColors[grn.quality_check] || "bg-muted text-muted-foreground")}>
                    {grn.quality_check}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{grn.users?.full_name || "—"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No GRN records yet. Use "Receive Stock" to create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GRNPanel;
