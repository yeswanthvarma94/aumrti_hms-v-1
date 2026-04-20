import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Users, BedDouble, IndianRupee, AlertTriangle, ArrowRight } from "lucide-react";

interface BranchKPIs {
  opdToday: number;
  bedsOccupied: number;
  bedsTotal: number;
  revenueToday: number;
  criticalAlerts: number;
  loading: boolean;
}

interface BranchOverviewCardProps {
  hospitalId: string;
  hospitalName: string;
  state?: string | null;
  onView: (hospitalId: string) => void;
  refreshKey: number;
}

const BranchOverviewCard: React.FC<BranchOverviewCardProps> = ({
  hospitalId, hospitalName, state, onView, refreshKey,
}) => {
  const [kpis, setKpis] = useState<BranchKPIs>({
    opdToday: 0, bedsOccupied: 0, bedsTotal: 0,
    revenueToday: 0, criticalAlerts: 0, loading: true,
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchKPIs = useCallback(async () => {
    const [opd, beds, bills, alerts] = await Promise.all([
      supabase.from("opd_tokens").select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId).eq("visit_date", today),
      supabase.from("beds").select("status").eq("hospital_id", hospitalId).eq("is_active", true),
      supabase.from("bills").select("paid_amount").eq("hospital_id", hospitalId).eq("bill_date", today).limit(500),
      supabase.from("clinical_alerts").select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId).eq("is_acknowledged", false).eq("severity", "critical"),
    ]);

    const occ = (beds.data || []).filter(b => b.status === "occupied").length;
    const total = (beds.data || []).length;
    const rev = (bills.data || []).reduce((s, b) => s + (b.paid_amount || 0), 0);

    setKpis({
      opdToday: opd.count || 0,
      bedsOccupied: occ,
      bedsTotal: total,
      revenueToday: rev,
      criticalAlerts: alerts.count || 0,
      loading: false,
    });
  }, [hospitalId, today]);

  useEffect(() => { fetchKPIs(); }, [fetchKPIs, refreshKey]);

  const occPct = kpis.bedsTotal > 0 ? Math.round((kpis.bedsOccupied / kpis.bedsTotal) * 100) : 0;

  return (
    <div className="bg-background rounded-2xl p-5 border border-border hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-bold text-base truncate">{hospitalName}</h3>
          {state && <p className="text-xs text-muted-foreground">{state}</p>}
        </div>
        {kpis.criticalAlerts > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
            {kpis.criticalAlerts} alerts
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Users size={12} />
            <span className="text-[10px] uppercase font-semibold">OPD Today</span>
          </div>
          <p className="text-2xl font-bold text-primary">{kpis.opdToday}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <BedDouble size={12} />
            <span className="text-[10px] uppercase font-semibold">Beds</span>
          </div>
          <p className="text-2xl font-bold">{occPct}%</p>
          <p className="text-[10px] text-muted-foreground">{kpis.bedsOccupied}/{kpis.bedsTotal}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <IndianRupee size={12} />
            <span className="text-[10px] uppercase font-semibold">Revenue</span>
          </div>
          <p className="text-lg font-bold text-emerald-700">
            ₹{(kpis.revenueToday / 1000).toFixed(1)}k
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <AlertTriangle size={12} />
            <span className="text-[10px] uppercase font-semibold">Critical</span>
          </div>
          <p className={`text-2xl font-bold ${kpis.criticalAlerts > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {kpis.criticalAlerts}
          </p>
        </div>
      </div>

      <button
        onClick={() => onView(hospitalId)}
        className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        View Branch <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default BranchOverviewCard;
