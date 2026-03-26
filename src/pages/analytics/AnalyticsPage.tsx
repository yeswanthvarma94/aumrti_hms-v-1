import React, { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { RefreshCw, Download, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import RevenueTab from "@/components/analytics/RevenueTab";
import ClinicalTab from "@/components/analytics/ClinicalTab";
import DoctorsTab from "@/components/analytics/DoctorsTab";
import DepartmentsTab from "@/components/analytics/DepartmentsTab";
import QualityTab from "@/components/analytics/QualityTab";
import AIDigestTab from "@/components/analytics/AIDigestTab";
import type { DateRange } from "@/hooks/useAnalyticsData";

const QUICK_RANGES = [
  { label: "Today", key: "today" },
  { label: "Yesterday", key: "yesterday" },
  { label: "This Week", key: "this_week" },
  { label: "This Month", key: "this_month" },
  { label: "Last Month", key: "last_month" },
] as const;

type QuickRange = typeof QUICK_RANGES[number]["key"];

const TABS = [
  { id: "revenue", label: "📊 Revenue" },
  { id: "clinical", label: "🏥 Clinical" },
  { id: "doctors", label: "👨‍⚕️ Doctors" },
  { id: "departments", label: "🏢 Departments" },
  { id: "quality", label: "✅ Quality" },
  { id: "digest", label: "🤖 AI Digest" },
] as const;

function getRange(key: QuickRange): DateRange {
  const today = new Date();
  switch (key) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "yesterday": {
      const y = subDays(today, 1);
      return { from: format(y, "yyyy-MM-dd"), to: format(y, "yyyy-MM-dd") };
    }
    case "this_week":
      return { from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    case "this_month":
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { from: format(startOfMonth(lm), "yyyy-MM-dd"), to: format(endOfMonth(lm), "yyyy-MM-dd") };
    }
  }
}

const AnalyticsPage: React.FC = () => {
  const [quickRange, setQuickRange] = useState<QuickRange>("this_month");
  const [activeTab, setActiveTab] = useState("revenue");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const range = useMemo(() => getRange(quickRange), [quickRange]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    setLastUpdated(new Date());
    toast({ title: "Data refreshed" });
  };

  const timeAgo = useMemo(() => {
    const diffMs = Date.now() - lastUpdated.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    return `${mins}m ago`;
  }, [lastUpdated]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="h-[52px] flex-shrink-0 bg-card border-b border-border px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-foreground">Analytics & BI</h1>
          <span className="text-[11px] text-muted-foreground">Updated {timeAgo}</span>
        </div>

        <div className="flex items-center gap-1">
          {QUICK_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setQuickRange(r.key)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                quickRange === r.key
                  ? "bg-sidebar text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="text-[11px] gap-1.5 bg-primary">
            <Bot size={14} /> AI Digest
          </Button>
          <Button size="sm" variant="outline" className="text-[11px] gap-1.5">
            <Download size={14} /> Export
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleRefresh}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="h-[44px] flex-shrink-0 bg-card border-b border-border px-5 flex items-end gap-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 pb-2.5 pt-2 text-[13px] font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-sidebar text-sidebar-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        {activeTab === "revenue" && <RevenueTab range={range} />}
        {activeTab === "clinical" && <ClinicalTab range={range} />}
        {activeTab === "doctors" && <DoctorsTab range={range} />}
        {activeTab === "departments" && <DepartmentsTab range={range} />}
        {activeTab === "quality" && <PlaceholderTab title="Quality & NABH Analytics" />}
        {activeTab === "digest" && <PlaceholderTab title="AI Executive Digest" />}
      </div>
    </div>
  );
};

export default AnalyticsPage;
