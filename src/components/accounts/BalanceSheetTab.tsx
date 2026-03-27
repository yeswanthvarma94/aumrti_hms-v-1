import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface Props { hospitalId: string; }

const BalanceSheetTab: React.FC<Props> = ({ hospitalId }) => {
  const [asOf, setAsOf] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<Record<string, any[]>>({ asset: [], liability: [], equity: [] });

  useEffect(() => {
    const load = async () => {
      const { data: lines } = await (supabase as any)
        .from("journal_entry_lines")
        .select("debit, credit, account:chart_of_accounts(code, name, account_type), journal_entry:journal_entries(entry_date)")
        .in("account.account_type", ["asset", "liability", "equity"])
        .lte("journal_entry.entry_date", asOf);

      const filtered = (lines || []).filter((d: any) => d.account && d.journal_entry);
      const map: Record<string, { name: string; code: string; type: string; balance: number }> = {};
      
      filtered.forEach((line: any) => {
        const key = line.account.code;
        if (!map[key]) map[key] = { name: line.account.name, code: key, type: line.account.account_type, balance: 0 };
        // Assets: debit increases. Liabilities/Equity: credit increases.
        if (line.account.account_type === "asset") {
          map[key].balance += Number(line.debit) - Number(line.credit);
        } else {
          map[key].balance += Number(line.credit) - Number(line.debit);
        }
      });

      const items = Object.values(map).filter((i) => i.balance !== 0);
      setData({
        asset: items.filter((i) => i.type === "asset").sort((a, b) => a.code.localeCompare(b.code)),
        liability: items.filter((i) => i.type === "liability").sort((a, b) => a.code.localeCompare(b.code)),
        equity: items.filter((i) => i.type === "equity").sort((a, b) => a.code.localeCompare(b.code)),
      });
    };
    load();
  }, [hospitalId, asOf]);

  const totalAssets = data.asset.reduce((s, a) => s + a.balance, 0);
  const totalLiab = data.liability.reduce((s, l) => s + l.balance, 0);
  const totalEquity = data.equity.reduce((s, e) => s + e.balance, 0);

  const Section = ({ title, items, total, color }: { title: string; items: any[]; total: number; color: string }) => (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.length === 0 ? (
            <tr><td className="px-4 py-4 text-center text-muted-foreground" colSpan={2}>No entries</td></tr>
          ) : items.map((item) => (
            <tr key={item.code} className="border-t border-border">
              <td className="px-4 py-2">
                <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>{item.name}
              </td>
              <td className={`px-4 py-2 text-right font-mono ${color}`}>₹{item.balance.toLocaleString("en-IN")}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border font-bold bg-muted/30">
            <td className="px-4 py-2">Total {title}</td>
            <td className={`px-4 py-2 text-right font-mono ${color}`}>₹{total.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">As of:</span>
        <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-[180px]" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Assets" items={data.asset} total={totalAssets} color="text-primary" />
        <div className="space-y-4">
          <Section title="Liabilities" items={data.liability} total={totalLiab} color="text-destructive" />
          <Section title="Equity" items={data.equity} total={totalEquity} color="text-foreground" />
          <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 flex justify-between font-bold text-sm">
            <span>Total Liabilities + Equity</span>
            <span className="font-mono">₹{(totalLiab + totalEquity).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {Math.abs(totalAssets - (totalLiab + totalEquity)) > 0.01 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          ⚠️ Balance sheet does not balance. Difference: ₹{Math.abs(totalAssets - (totalLiab + totalEquity)).toLocaleString("en-IN")}
        </div>
      )}
    </div>
  );
};

export default BalanceSheetTab;
