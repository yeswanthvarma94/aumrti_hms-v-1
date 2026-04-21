import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_REALTIME } from "@/hooks/queries/staleTimes";
import { Pill, ShoppingCart, Package, ClipboardList, BarChart3, Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PharmacyStockTab from "@/components/pharmacy/PharmacyStockTab";
import PharmacyNDPSTab from "@/components/pharmacy/PharmacyNDPSTab";
import PharmacyReportsTab from "@/components/pharmacy/PharmacyReportsTab";
import StockAlertsDrawer from "@/components/pharmacy/StockAlertsDrawer";
import ReceiveStockModal from "@/components/pharmacy/ReceiveStockModal";
import PharmacyDispenseTab from "@/components/pharmacy/PharmacyDispenseTab";

type PharmacyMode = "ip" | "retail";
type PharmacyTab = "dispense" | "stock" | "ndps" | "reports";

const PharmacyPage: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hospitalId } = useHospitalId();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PharmacyMode>(
    (searchParams.get("mode") as PharmacyMode) || "ip"
  );
  const [activeTab, setActiveTab] = useState<PharmacyTab>(
    (searchParams.get("tab") as PharmacyTab) || "dispense"
  );
  const [showAlerts, setShowAlerts] = useState(false);
  const [showReceiveStock, setShowReceiveStock] = useState(false);

  const { data: alertCount = 0 } = useQuery({
    queryKey: ["pharmacy-alert-count", hospitalId],
    enabled: !!hospitalId,
    staleTime: STALE_REALTIME,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { count } = await supabase
        .from("pharmacy_stock_alerts")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId as string)
        .eq("is_acknowledged", false);
      return count || 0;
    },
  });

  const refetchAlertCount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pharmacy-alert-count", hospitalId] });
  }, [queryClient, hospitalId]);

  const handleModeChange = (m: PharmacyMode) => {
    setMode(m);
    setActiveTab("dispense");
    setSearchParams(m === "retail" ? { mode: "retail" } : {});
  };

  const handleTabChange = (t: PharmacyTab) => {
    setActiveTab(t);
    if (t !== "dispense") {
      setSearchParams({ tab: t });
    } else {
      setSearchParams(mode === "retail" ? { mode: "retail" } : {});
    }
  };

  const tabs = [
    { key: "dispense" as const, label: "Dispense", icon: Pill },
    { key: "stock" as const, label: "Stock", icon: Package },
    { key: "ndps" as const, label: "NDPS Register", icon: ClipboardList },
    { key: "reports" as const, label: "Reports", icon: BarChart3 },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* TOP BAR */}
      <div className="h-[52px] flex-shrink-0 bg-background border-b border-border px-5 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-foreground">Pharmacy</p>
          <p className="text-xs text-muted-foreground">Dashboard › Pharmacy</p>
        </div>

        {/* MODE TOGGLE */}
        <div className="bg-muted rounded-[10px] p-1 flex gap-0">
          <button
            onClick={() => handleModeChange("ip")}
            className={cn(
              "flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-bold transition-all active:scale-[0.97]",
              mode === "ip"
                ? "bg-sidebar text-white shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span>🏥</span> IP Dispensing
          </button>
          <button
            onClick={() => handleModeChange("retail")}
            className={cn(
              "flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-bold transition-all active:scale-[0.97]",
              mode === "retail"
                ? "bg-sidebar text-white shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingCart size={16} /> Retail Counter
          </button>
        </div>

        <div className="flex items-center gap-3">
          {alertCount > 0 && (
            <button
              onClick={() => setShowAlerts(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors active:scale-[0.97]"
            >
              <Bell size={14} />
              ⚠️ {alertCount} Stock Alert{alertCount !== 1 ? "s" : ""}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowReceiveStock(true)}
          >
            <Plus size={14} className="mr-1" /> Receive Stock
          </Button>
          <span className="text-xs text-muted-foreground">{today}</span>
        </div>
      </div>

      {/* SUB-TAB STRIP */}
      <div className="h-[44px] flex-shrink-0 bg-background border-b border-border px-5 flex items-center gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors active:scale-[0.97]",
                activeTab === t.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "dispense" && hospitalId && (
          <PharmacyDispenseTab hospitalId={hospitalId} mode={mode} />
        )}
        {activeTab === "stock" && hospitalId && (
          <PharmacyStockTab hospitalId={hospitalId} onReceiveStock={() => setShowReceiveStock(true)} />
        )}
        {activeTab === "ndps" && hospitalId && (
          <PharmacyNDPSTab hospitalId={hospitalId} />
        )}
        {activeTab === "reports" && hospitalId && (
          <PharmacyReportsTab hospitalId={hospitalId} />
        )}
      </div>

      {/* DRAWERS / MODALS */}
      {showAlerts && hospitalId && (
        <StockAlertsDrawer
          hospitalId={hospitalId}
          onClose={() => { setShowAlerts(false); refetchAlertCount(); }}
        />
      )}
      {showReceiveStock && hospitalId && (
        <ReceiveStockModal
          hospitalId={hospitalId}
          onClose={() => setShowReceiveStock(false)}
          onSaved={() => { setShowReceiveStock(false); refetchAlertCount(); toast({ title: "Stock received successfully" }); }}
        />
      )}
    </div>
  );
};

export default PharmacyPage;
