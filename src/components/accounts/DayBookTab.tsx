import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Search } from "lucide-react";

interface Props { hospitalId: string; }

const DayBookTab: React.FC<Props> = ({ hospitalId }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("journal_entries")
        .select("*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))")
        .eq("hospital_id", hospitalId)
        .eq("entry_date", dateFilter)
        .order("created_at", { ascending: false });
      setEntries(data || []);
      setLoading(false);
    };
    load();
  }, [hospitalId, dateFilter]);

  const sourceColor = (mod: string) => {
    switch (mod) {
      case "billing": return "bg-primary/10 text-primary";
      case "grn": return "bg-amber-500/10 text-amber-600";
      case "payroll": return "bg-violet-500/10 text-violet-600";
      case "manual": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 w-[180px]"
          />
        </div>
        <span className="text-sm text-muted-foreground">{entries.length} entries</span>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Entry #</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Source</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Narration</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Account</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Debit (₹)</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No journal entries for this date</td></tr>
            ) : (
              entries.map((entry: any) => (
                <React.Fragment key={entry.id}>
                  {entry.lines?.map((line: any, i: number) => (
                    <tr key={line.id} className="border-t border-border hover:bg-muted/30">
                      {i === 0 && (
                        <>
                          <td className="px-4 py-2 font-mono text-xs" rowSpan={entry.lines.length}>{entry.entry_number}</td>
                          <td className="px-4 py-2" rowSpan={entry.lines.length}>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColor(entry.source_module)}`}>
                              {entry.source_module || "manual"}
                            </span>
                            {entry.is_auto && <span className="ml-1 text-[10px] text-muted-foreground">⚡</span>}
                          </td>
                          <td className="px-4 py-2 text-xs" rowSpan={entry.lines.length}>{entry.narration}</td>
                        </>
                      )}
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{line.account?.code}</span>
                        {line.account?.name}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {Number(line.debit) > 0 ? Number(line.debit).toLocaleString("en-IN") : ""}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {Number(line.credit) > 0 ? Number(line.credit).toLocaleString("en-IN") : ""}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DayBookTab;
