import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClipboardList, Coins, Users, Package, BarChart3, Plus } from "lucide-react";
import PmjayPreAuthTab from "@/components/pmjay/PmjayPreAuthTab";
import PmjayClaimsTab from "@/components/pmjay/PmjayClaimsTab";
import PmjayBeneficiariesTab from "@/components/pmjay/PmjayBeneficiariesTab";
import PmjayPackagesTab from "@/components/pmjay/PmjayPackagesTab";
import PmjayAnalyticsTab from "@/components/pmjay/PmjayAnalyticsTab";

const tabs = [
  { key: "preauth", label: "Pre-Auth", icon: ClipboardList },
  { key: "claims", label: "Claims", icon: Coins },
  { key: "beneficiaries", label: "Beneficiaries", icon: Users },
  { key: "packages", label: "Packages", icon: Package },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

interface KPIs {
  activePreAuths: number;
  pendingApprovals: number;
  claimsThisMonth: number;
  claimedAmount: number;
  recoveryRate: number;
}

const PmjayPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("preauth");
  const [kpis, setKpis] = useState<KPIs>({ activePreAuths: 0, pendingApprovals: 0, claimsThisMonth: 0, claimedAmount: 0, recoveryRate: 0 });
  const [showBeneficiaryForm, setShowBeneficiaryForm] = useState(false);
  const [showPreAuthForm, setShowPreAuthForm] = useState(false);

  useEffect(() => { loadKPIs(); }, []);

  const loadKPIs = async () => {
    try {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [preAuthRes, pendingRes, claimsRes, settledRes] = await Promise.all([
        supabase.from("pre_auth_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("pre_auth_requests").select("id", { count: "exact", head: true }).eq("status", "under_review"),
        supabase.from("pmjay_claims").select("claimed_amount").gte("created_at", monthStart),
        supabase.from("pmjay_claims").select("settled_amount").eq("status", "settled").gte("created_at", monthStart),
      ]);

      const claimsData = claimsRes.data || [];
      const settledData = settledRes.data || [];
      const totalClaimed = claimsData.reduce((s, c) => s + Number(c.claimed_amount || 0), 0);
      const totalSettled = settledData.reduce((s, c) => s + Number(c.settled_amount || 0), 0);

      setKpis({
        activePreAuths: preAuthRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        claimsThisMonth: claimsData.length,
        claimedAmount: totalClaimed,
        recoveryRate: totalClaimed > 0 ? Math.round((totalSettled / totalClaimed) * 100) : 0,
      });
    } catch { /* ignore */ }
  };

  const kpiCards = [
    { label: "Active Pre-Auths", value: kpis.activePreAuths, color: "text-blue-700 bg-blue-50" },
    { label: "Pending Approvals", value: kpis.pendingApprovals, color: "text-amber-700 bg-amber-50" },
    { label: "Claims This Month", value: kpis.claimsThisMonth, color: "text-primary bg-primary/5" },
    { label: "Claimed Amount", value: `₹${(kpis.claimedAmount / 100000).toFixed(1)}L`, color: "text-emerald-700 bg-emerald-50" },
    { label: "Recovery Rate", value: `${kpis.recoveryRate}%`, color: "text-purple-700 bg-purple-50" },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case "preauth": return <PmjayPreAuthTab showNewForm={showPreAuthForm} onFormClosed={() => setShowPreAuthForm(false)} />;
      case "claims": return <PmjayClaimsTab />;
      case "beneficiaries": return <PmjayBeneficiariesTab showNewForm={showBeneficiaryForm} onFormClosed={() => setShowBeneficiaryForm(false)} />;
      case "packages": return <PmjayPackagesTab />;
      case "analytics": return <PmjayAnalyticsTab />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="h-[52px] flex-shrink-0 bg-background border-b border-border px-5 flex items-center justify-between">
        <h1 className="text-base font-bold text-foreground">🏥 PMJAY & Government Schemes</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setActiveTab("beneficiaries"); setShowBeneficiaryForm(true); }}>
            <Plus size={14} className="mr-1" /> Register Beneficiary
          </Button>
          <Button size="sm" onClick={() => { setActiveTab("preauth"); setShowPreAuthForm(true); }}>
            <Plus size={14} className="mr-1" /> New Pre-Auth
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="h-[72px] flex-shrink-0 border-b border-border px-5 flex items-center gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className={cn("flex-1 rounded-lg px-3 py-2 text-center", k.color)}>
            <div className="text-lg font-bold font-mono">{k.value}</div>
            <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="h-[44px] flex-shrink-0 border-b border-border px-5 flex items-center gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-md text-[13px] font-medium transition-colors",
                activeTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        {renderTab()}
      </div>
    </div>
  );
};

export default PmjayPage;
