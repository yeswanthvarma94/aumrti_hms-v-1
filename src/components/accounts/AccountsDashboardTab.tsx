import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Scale, TrendingUp } from "lucide-react";

interface Props {
  hospitalId: string | null;
  dateRange: { start: string; end: string };
}

const AccountsDashboardTab: React.FC<Props> = ({ hospitalId, dateRange }) => {
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0, netIncome: 0, journalCount: 0 });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadStats();
    loadRecent();
  }, [hospitalId, dateRange]);

  const loadStats = async () => {
    // Revenue from journal line items (credit to 4xxx accounts)
    const { data: revData } = await supabase
      .from("journal_line_items")
      .select("credit_amount")
      .eq("hospital_id", hospitalId!)
      .gte("created_at", dateRange.start)
      .lte("created_at", dateRange.end + "T23:59:59")
      .like("account_code", "4%");

    const totalRevenue = (revData || []).reduce((s, r) => s + Number(r.credit_amount || 0), 0);

    // Expenses from journal line items (debit to 5xxx accounts)
    const { data: expData } = await supabase
      .from("journal_line_items")
      .select("debit_amount")
      .eq("hospital_id", hospitalId!)
      .gte("created_at", dateRange.start)
      .lte("created_at", dateRange.end + "T23:59:59")
      .like("account_code", "5%");

    const totalExpenses = (expData || []).reduce((s, r) => s + Number(r.debit_amount || 0), 0);

    const { count } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId!)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    setStats({ totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses, journalCount: count || 0 });
  };

  const loadRecent = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("hospital_id", hospitalId!)
      .order("created_at", { ascending: false })
      .limit(10);
    setRecentEntries(data || []);
  };

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const kpis = [
    { label: "Total Revenue", value: fmt(stats.totalRevenue), icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
    { label: "Total Expenses", value: fmt(stats.totalExpenses), icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
    { label: "Net Income", value: (stats.netIncome >= 0 ? "" : "-") + fmt(stats.netIncome), icon: TrendingUp, color: stats.netIncome >= 0 ? "text-emerald-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { label: "Journal Entries", value: String(stats.journalCount), icon: Scale, color: "text-primary", bg: "bg-primary/5" },
  ];

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon size={16} className={k.color} />
                </div>
              </div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Journal Entries */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No journal entries yet. Entries will auto-create when billing, GRN, or payroll events occur.
            </p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.entry_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-foreground">{fmt(e.total_debit)}</p>
                    <p className="text-[10px] text-muted-foreground">{e.entry_date}</p>
                  </div>
                  <span className={`ml-3 text-[10px] px-2 py-0.5 rounded-full ${
                    e.entry_type?.startsWith("auto") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground"
                  }`}>
                    {e.entry_type?.replace("auto_", "⚡ ") || "manual"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsDashboardTab;
