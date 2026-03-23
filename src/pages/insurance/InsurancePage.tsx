import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, ClipboardList, Send, BarChart3, CalendarClock, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ActiveAdmissions from "@/components/insurance/ActiveAdmissions";
import PreAuthQueue from "@/components/insurance/PreAuthQueue";
import ClaimsToSubmit from "@/components/insurance/ClaimsToSubmit";
import ClaimsStatus from "@/components/insurance/ClaimsStatus";
import TPAAgeing from "@/components/insurance/TPAAgeing";
import TPAConfiguration from "@/components/insurance/TPAConfiguration";

const navItems = [
  { key: "admissions", label: "Active Admissions", icon: Building2 },
  { key: "preauth", label: "Pre-Auth Queue", icon: ClipboardList },
  { key: "submit", label: "Claims to Submit", icon: Send },
  { key: "status", label: "Claims Status", icon: BarChart3 },
  { key: "ageing", label: "TPA Ageing", icon: CalendarClock },
  { key: "config", label: "TPA Configuration", icon: Settings2 },
];

const InsurancePage: React.FC = () => {
  const [activeNav, setActiveNav] = useState("admissions");
  const [kpis, setKpis] = useState({ pendingPreAuth: 0, outstandingClaims: 0, deniedThisMonth: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const [preAuthRes, claimsRes, deniedRes] = await Promise.all([
        supabase.from("insurance_pre_auth").select("id", { count: "exact", head: true })
          .in("status", ["pending", "submitted", "under_review"]),
        supabase.from("insurance_claims").select("claimed_amount")
          .in("status", ["submitted", "under_review", "approved"]),
        supabase.from("insurance_claims").select("id", { count: "exact", head: true })
          .eq("status", "rejected")
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const outstanding = (claimsRes.data || []).reduce((s, c) => s + Number(c.claimed_amount || 0), 0);
      setKpis({
        pendingPreAuth: preAuthRes.count || 0,
        outstandingClaims: outstanding,
        deniedThisMonth: deniedRes.count || 0,
      });
    } catch { /* ignore */ }
  };

  const renderContent = () => {
    switch (activeNav) {
      case "admissions": return <ActiveAdmissions />;
      case "preauth": return <PreAuthQueue />;
      case "submit": return <ClaimsToSubmit />;
      case "status": return <ClaimsStatus />;
      case "ageing": return <TPAAgeing />;
      case "config": return <TPAConfiguration />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Page Header */}
      <div className="h-[52px] flex-shrink-0 bg-background border-b border-border px-5 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground">Insurance & TPA</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
            Pre-Auth: {kpis.pendingPreAuth} pending
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
            Claims: ₹{(kpis.outstandingClaims / 100000).toFixed(1)}L outstanding
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">
            Denied: {kpis.deniedThisMonth} this month
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Nav */}
        <nav className="w-[240px] bg-background border-r border-border flex-shrink-0 flex flex-col py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                className={cn(
                  "flex items-center gap-3 h-12 px-4 text-[13px] font-medium transition-colors text-left w-full",
                  isActive
                    ? "bg-primary/5 text-primary border-l-[3px] border-primary"
                    : "text-muted-foreground hover:bg-muted/50 border-l-[3px] border-transparent"
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InsurancePage;
