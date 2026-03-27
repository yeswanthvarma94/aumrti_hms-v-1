import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Props { hospitalId: string; }

const LedgerTab: React.FC<Props> = ({ hospitalId }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [lines, setLines] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("chart_of_accounts")
        .select("id, code, name, account_type")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("code");
      setAccounts(data || []);
    })();
  }, [hospitalId]);

  useEffect(() => {
    if (!selectedAccount) { setLines([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("journal_entry_lines")
        .select("*, journal_entry:journal_entries(entry_number, entry_date, narration, source_module)")
        .eq("account_id", selectedAccount)
        .gte("journal_entry.entry_date", fromDate)
        .lte("journal_entry.entry_date", toDate)
        .order("created_at", { ascending: true });
      // Filter out nulls (from date filter on join)
      setLines((data || []).filter((l: any) => l.journal_entry));
    })();
  }, [selectedAccount, fromDate, toDate]);

  let running = 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select account..." />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="font-mono text-xs mr-2">{a.code}</span> {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
        <span className="text-muted-foreground text-sm">to</span>
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Entry #</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Narration</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Debit (₹)</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Credit (₹)</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {!selectedAccount ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Select an account to view ledger</td></tr>
            ) : lines.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No transactions in this period</td></tr>
            ) : (
              lines.map((line: any) => {
                running += Number(line.debit) - Number(line.credit);
                return (
                  <tr key={line.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2 text-xs">{line.journal_entry?.entry_date}</td>
                    <td className="px-4 py-2 font-mono text-xs">{line.journal_entry?.entry_number}</td>
                    <td className="px-4 py-2 text-xs">{line.journal_entry?.narration}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(line.debit) > 0 ? Number(line.debit).toLocaleString("en-IN") : ""}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(line.credit) > 0 ? Number(line.credit).toLocaleString("en-IN") : ""}</td>
                    <td className={`px-4 py-2 text-right font-mono font-medium ${running < 0 ? "text-destructive" : ""}`}>
                      {Math.abs(running).toLocaleString("en-IN")}{running < 0 ? " Cr" : " Dr"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LedgerTab;
