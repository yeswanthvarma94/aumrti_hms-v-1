import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props { hospitalId: string; }

const ProfitLossTab: React.FC<Props> = ({ hospitalId }) => {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      // Get all journal lines with account info within date range
      const { data } = await (supabase as any)
        .from("journal_entry_lines")
        .select("debit, credit, account:chart_of_accounts(code, name, account_type), journal_entry:journal_entries(entry_date)")
        .in("account.account_type", ["revenue", "expense"])
        .gte("journal_entry.entry_date", fromDate)
        .lte("journal_entry.entry_date", toDate);

      const filtered = (data || []).filter((d: any) => d.account && d.journal_entry);

      // Aggregate by account
      const map: Record<string, { name: string; code: string; type: string; amount: number }> = {};
      filtered.forEach((line: any) => {
        const key = line.account.code;
        if (!map[key]) map[key] = { name: line.account.name, code: key, type: line.account.account_type, amount: 0 };
        if (line.account.account_type === "revenue") {
          map[key].amount += Number(line.credit) - Number(line.debit);
        } else {
          map[key].amount += Number(line.debit) - Number(line.credit);
        }
      });

      const items = Object.values(map).filter((i) => i.amount !== 0);
      setRevenue(items.filter((i) => i.type === "revenue").sort((a, b) => b.amount - a.amount));
      setExpenses(items.filter((i) => i.type === "expense").sort((a, b) => b.amount - a.amount));
    };
    load();
  }, [hospitalId, fromDate, toDate]);

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
        <span className="text-muted-foreground text-sm">to</span>
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-success flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ₹{totalRevenue.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-destructive flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            ₹{totalExpenses.toLocaleString("en-IN")}
          </p>
        </div>
        <div className={`border rounded-lg p-4 ${netProfit >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net {netProfit >= 0 ? "Profit" : "Loss"}</p>
          <p className={`text-xl font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
            ₹{Math.abs(netProfit).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Revenue */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {revenue.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={2}>No revenue entries</td></tr>
              ) : revenue.map((r) => (
                <tr key={r.code} className="border-t border-border">
                  <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground mr-2">{r.code}</span>{r.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-success">₹{r.amount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold bg-muted/30">
                <td className="px-4 py-2">Total Revenue</td>
                <td className="px-4 py-2 text-right font-mono text-success">₹{totalRevenue.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expenses */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Expenses</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {expenses.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={2}>No expense entries</td></tr>
              ) : expenses.map((e) => (
                <tr key={e.code} className="border-t border-border">
                  <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground mr-2">{e.code}</span>{e.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-destructive">₹{e.amount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold bg-muted/30">
                <td className="px-4 py-2">Total Expenses</td>
                <td className="px-4 py-2 text-right font-mono text-destructive">₹{totalExpenses.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossTab;
