import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  hospitalId: string | null;
  dateRange: { start: string; end: string };
}

const JournalTab: React.FC<Props> = ({ hospitalId, dateRange }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadEntries();
  }, [hospitalId, dateRange]);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("hospital_id", hospitalId!)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end)
      .order("created_at", { ascending: false })
      .limit(100);
    setEntries(data || []);
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const { data } = await supabase
      .from("journal_line_items")
      .select("*")
      .eq("journal_id", id)
      .order("debit_amount", { ascending: false });
    setLineItems(data || []);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const typeColor = (t: string) => {
    if (t?.startsWith("auto")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-5">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8"></TableHead>
              <TableHead className="text-xs">Entry #</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs text-right">Debit</TableHead>
              <TableHead className="text-xs text-right">Credit</TableHead>
              <TableHead className="text-xs text-center">Balanced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No journal entries in this period</TableCell></TableRow>
            ) : (
              entries.map((e) => (
                <React.Fragment key={e.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(e.id)}>
                    <TableCell>
                      {expanded === e.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{e.entry_number}</TableCell>
                    <TableCell className="text-xs">{e.entry_date}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{e.description}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${typeColor(e.entry_type)}`}>{e.entry_type?.replace("auto_", "⚡ ")}</Badge></TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{e.source_module || "—"}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(e.total_debit)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(e.total_credit)}</TableCell>
                    <TableCell className="text-center">
                      {e.is_balanced ? <span className="text-emerald-600">✓</span> : <span className="text-red-500">✗</span>}
                    </TableCell>
                  </TableRow>
                  {expanded === e.id && lineItems.map((li) => (
                    <TableRow key={li.id} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground" colSpan={2}>{li.account_code}</TableCell>
                      <TableCell className="text-[10px]">{li.account_name}</TableCell>
                      <TableCell colSpan={2} className="text-[10px] text-muted-foreground">{li.description}</TableCell>
                      <TableCell className="text-[10px] text-right">{Number(li.debit_amount) > 0 ? fmt(li.debit_amount) : ""}</TableCell>
                      <TableCell className="text-[10px] text-right">{Number(li.credit_amount) > 0 ? fmt(li.credit_amount) : ""}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default JournalTab;
