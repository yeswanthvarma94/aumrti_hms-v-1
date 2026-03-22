import React, { useEffect } from "react";
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
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

function formatRevenue(amount: number): string {
  if (amount >= 10000000) return "₹" + (amount / 10000000).toFixed(1) + "Cr";
  if (amount >= 100000) return "₹" + (amount / 100000).toFixed(1) + "L";
  return "₹" + amount.toLocaleString("en-IN");
}

function revenueChange(current: number, last: number): { text: string; positive: boolean } {
  if (last === 0) return { text: "First month", positive: true };
  const pct = ((current - last) / last) * 100;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs last month`,
    positive: pct >= 0,
  };
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

const Dashboard: React.FC = () => {
  const { kpis, loading, seeding, seedData } = useDashboardData();

  const occupancyPct = kpis.bedsTotal > 0 ? Math.round((kpis.bedsOccupied / kpis.bedsTotal) * 100) : 0;
  const revChange = revenueChange(kpis.revenueMTD, kpis.revenueLastMonth);
  const isEmpty = !loading && kpis.totalPatients === 0 && kpis.bedsTotal === 0;

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
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

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Database size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No data yet. Load sample data to see your dashboard in action.</p>
          <Button onClick={seedData} disabled={seeding} size="lg">
            {seeding ? "Loading sample data..." : "Load Sample Data"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1 — Total Patients */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
            <Users size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  <CountUpValue value={kpis.totalPatients} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">+{kpis.patientsToday} today</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Beds Occupied */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Beds Occupied</CardTitle>
            <BedDouble size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  <CountUpValue value={kpis.bedsOccupied} /> / <CountUpValue value={kpis.bedsTotal} />
                </div>
                <p className={cn("text-xs mt-1", occupancyColor(occupancyPct))}>
                  {occupancyPct}% occupancy
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 3 — OPD Tokens */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">OPD Tokens</CardTitle>
            <Activity size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  <CountUpValue value={kpis.opdActive} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.opdWaiting} waiting · {kpis.opdSeen} seen today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 4 — Revenue MTD */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (MTD)</CardTitle>
            <IndianRupee size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatRevenue(kpis.revenueMTD)}
                </div>
                <p className={cn("text-xs mt-1", revChange.positive ? "text-[hsl(var(--success))]" : "text-destructive")}>
                  {revChange.text}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 5 — Doctors on Duty */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Doctors On Duty</CardTitle>
            <Stethoscope size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  <CountUpValue value={kpis.doctorsOnDuty} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{kpis.doctorsOnLeave} on leave today</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 6 — Critical Alerts */}
        <Card className={cn(
          "shadow-card hover:shadow-card-hover transition-shadow",
          kpis.criticalAlerts > 0 && !loading && "border-l-[3px] border-l-destructive"
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Alerts</CardTitle>
            <AlertTriangle size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className={cn("text-2xl font-bold", alertValueColor(kpis.criticalAlerts))}>
                  <CountUpValue value={kpis.criticalAlerts} />
                </div>
                <p className={cn("text-xs mt-1", kpis.criticalAlerts > 0 ? "text-destructive" : "text-[hsl(var(--success))]")}>
                  {kpis.criticalAlerts > 0 ? "Requires attention" : "All clear"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
