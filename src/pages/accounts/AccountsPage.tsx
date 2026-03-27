import React, { useState, useEffect } from "react";
import { BookOpen, FileText, TrendingUp, Scale, PenLine, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SEED_ACCOUNTS } from "@/lib/journalPosting";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import DayBookTab from "@/components/accounts/DayBookTab";
import LedgerTab from "@/components/accounts/LedgerTab";
import ProfitLossTab from "@/components/accounts/ProfitLossTab";
import BalanceSheetTab from "@/components/accounts/BalanceSheetTab";
import ManualEntryTab from "@/components/accounts/ManualEntryTab";
import ChartOfAccountsTab from "@/components/accounts/ChartOfAccountsTab";

const navTabs = [
  { id: "daybook", label: "Day Book", icon: BookOpen },
  { id: "ledger", label: "Ledger", icon: FileText },
  { id: "pnl", label: "P&L Statement", icon: TrendingUp },
  { id: "balancesheet", label: "Balance Sheet", icon: Scale },
  { id: "manual", label: "Manual Entry", icon: PenLine },
  { id: "coa", label: "Chart of Accounts", icon: List },
];

const AccountsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("daybook");
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("users").select("hospital_id").eq("id", user.id).single();
      if (data) {
        setHospitalId(data.hospital_id);
        // Seed chart of accounts if empty
        const { count } = await (supabase as any)
          .from("chart_of_accounts")
          .select("id", { count: "exact", head: true })
          .eq("hospital_id", data.hospital_id);
        if (count === 0) {
          const rows = SEED_ACCOUNTS.map((a) => ({ ...a, hospital_id: data.hospital_id, is_system: true }));
          await (supabase as any).from("chart_of_accounts").insert(rows);
          toast({ title: "Chart of Accounts initialized with standard hospital accounts" });
        }
      }
    };
    init();
  }, []);

  const renderContent = () => {
    if (!hospitalId) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
    switch (activeTab) {
      case "daybook": return <DayBookTab hospitalId={hospitalId} />;
      case "ledger": return <LedgerTab hospitalId={hospitalId} />;
      case "pnl": return <ProfitLossTab hospitalId={hospitalId} />;
      case "balancesheet": return <BalanceSheetTab hospitalId={hospitalId} />;
      case "manual": return <ManualEntryTab hospitalId={hospitalId} userId={userId} />;
      case "coa": return <ChartOfAccountsTab hospitalId={hospitalId} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      <div className="h-[52px] flex-shrink-0 bg-card border-b border-border flex items-center justify-between px-5">
        <span className="text-base font-bold text-foreground">Accounts & Finance</span>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
            📒 General Ledger
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-success/10 text-success font-medium">
            Auto-Posting Active
          </span>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[220px] bg-card border-r border-border flex flex-col">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-11 flex items-center gap-3 px-4 text-sm transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;
