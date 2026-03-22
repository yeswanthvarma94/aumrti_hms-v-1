import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  BedDouble,
  Activity,
  IndianRupee,
  Stethoscope,
  AlertTriangle,
  Database,
  RefreshCw,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import RevenueChart from "@/components/dashboard/RevenueChart";
import BedOccupancy from "@/components/dashboard/BedOccupancy";
import AlertsPanel from "@/components/dashboard/AlertsPanel";

function formatRevenue(amount: number): string {
  if (amount >= 10000000) return "₹" + (amount / 10000000).toFixed(1) + "Cr";
  if (amount >= 100000) return "₹" + (amount / 100000).toFixed(1) + "L";
  return "₹" + amount.toLocaleString("en-IN");
}

function revenueChange(current: number, last: number) {
  if (last === 0) return { text: "First month", positive: true };
  const pct = ((current - last) / last) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs last month`, positive: pct >= 0 };
}

function occupancyColor(pct: number) {
  if (pct > 85) return "text-destructive";
  if (pct >= 70) return "text-[hsl(38,92%,50%)]";
  return "text-[hsl(var(--success))]";
}

function alertValueColor(count: number) {
  if (count === 0) return "text-[hsl(var(--success))]";
  if (count <= 2) return "text-[hsl(38,92%,50%)]";
  return "text-destructive";
}

const CountUpValue: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const animated = useCountUp(value);
  return <span className={className}>{animated.toLocaleString("en-IN")}</span>;
};

function useLastUpdated(loading: boolean) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [label, setLabel] = useState("just now");

  useEffect(() => {
    if (!loading) setLastUpdated(new Date());
  }, [loading]);

  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diff < 60) setLabel("just now");
      else if (diff < 120) setLabel("1 min ago");
      else setLabel(`${Math.floor(diff / 60)} mins ago`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  return label;
}

const Dashboard: React.FC = () => {
  const { kpis, loading, seeding, seedData, refetch } = useDashboardData();
  const [refreshing, setRefreshing] = useState(false);
  const lastUpdated = useLastUpdated(loading);

  const occupancyPct = kpis.bedsTotal > 0 ? Math.round((kpis.bedsOccupied / kpis.bedsTotal) * 100) : 0;
  const revChange = revenueChange(kpis.revenueMTD, kpis.revenueLastMonth);
  const isEmpty = !loading && kpis.totalPatients === 0 && kpis.bedsTotal === 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          {!loading && (
            <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--success))]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--success))]" />
              </span>
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Updated {lastUpdated}</span>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md hover:bg-muted transition-colors active:scale-95"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={14} className={cn("text-muted-foreground", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <Database size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No data yet. Load sample data to see your dashboard in action.</p>
          <Button onClick={seedData} disabled={seeding} size="lg">
            {seeding ? "Loading sample data..." : "Load Sample Data"}
          </Button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* ROW 1 — KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 mb-3">
            {/* Card 1 */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Patients</CardTitle>
                <Users size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? <Skeleton className="h-6 w-16" /> : (
                  <>
                    <div className="text-lg font-bold text-foreground"><CountUpValue value={kpis.totalPatients} /></div>
                    <p className="text-[10px] text-muted-foreground">+{kpis.patientsToday} today</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Beds Occupied</CardTitle>
                <BedDouble size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? <Skeleton className="h-6 w-16" /> : (
                  <>
                    <div className="text-lg font-bold text-foreground">
                      <CountUpValue value={kpis.bedsOccupied} />/{kpis.bedsTotal}
                    </div>
                    <p className={cn("text-[10px]", occupancyColor(occupancyPct))}>{occupancyPct}% occupancy</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">OPD Tokens</CardTitle>
                <Activity size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? <Skeleton className="h-6 w-16" /> : (
                  <>
                    <div className="text-lg font-bold text-foreground"><CountUpValue value={kpis.opdActive} /></div>
                    <p className="text-[10px] text-muted-foreground">{kpis.opdWaiting} waiting · {kpis.opdSeen} seen</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 4 */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Revenue (MTD)</CardTitle>
                <IndianRupee size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? <Skeleton className="h-6 w-16" /> : (
                  <>
                    <div className="text-lg font-bold text-foreground">{formatRevenue(kpis.revenueMTD)}</div>
                    <p className={cn("text-[10px]", revChange.positive ? "text-[hsl(var(--success))]" : "text-destructive")}>{revChange.text}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 5 */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Doctors On Duty</CardTitle>
                <Stethoscope size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? <Skeleton className="h-6 w-16" /> : (
                  <>
                    <div className="text-lg font-bold text-foreground"><CountUpValue value={kpis.doctorsOnDuty} /></div>
                    <p className="text-[10px] text-muted-foreground">{kpis.doctorsOnLeave} on leave</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 6 */}
            <Card className={cn("shadow-sm hover:shadow-md transition-shadow", kpis.criticalAlerts > 0 && !loading && "border-l-[3px] border-l-destructive")}>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Critical Alerts</CardTitle>
                <AlertTriangle size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? <Skeleton className="h-6 w-16" /> : (
                  <>
                    <div className={cn("text-lg font-bold", alertValueColor(kpis.criticalAlerts))}><CountUpValue value={kpis.criticalAlerts} /></div>
                    <p className={cn("text-[10px]", kpis.criticalAlerts > 0 ? "text-destructive" : "text-[hsl(var(--success))]")}>
                      {kpis.criticalAlerts > 0 ? "Requires attention" : "All clear"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ROW 2 — Three panels */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_3fr_2fr] gap-3 flex-1 min-h-0">
            <RevenueChart />
            <BedOccupancy />
            <AlertsPanel kpis={kpis} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
