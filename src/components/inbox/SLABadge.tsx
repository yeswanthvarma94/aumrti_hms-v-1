import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface Props {
  deadline: string | null;
  resolvedAt?: string | null;
  compact?: boolean;
}

/** SLA countdown badge — green / amber / red based on time remaining. */
export default function SLABadge({ deadline, resolvedAt, compact }: Props) {
  const [, tick] = useState(0);

  // Re-render every 30s so countdown stays live.
  useEffect(() => {
    if (!deadline || resolvedAt) return;
    const i = setInterval(() => tick(t => t + 1), 30_000);
    return () => clearInterval(i);
  }, [deadline, resolvedAt]);

  if (!deadline) return null;

  if (resolvedAt) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium bg-emerald-100 text-emerald-700",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      )}>
        ✓ Resolved
      </span>
    );
  }

  const due = new Date(deadline).getTime();
  const now = Date.now();
  const minsLeft = Math.round((due - now) / 60_000);
  const breached = minsLeft < 0;
  const warning = !breached && minsLeft <= 60;

  const tone = breached
    ? "bg-destructive text-destructive-foreground animate-pulse"
    : warning
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  const label = breached
    ? `BREACHED ${Math.abs(minsLeft)}m ago`
    : minsLeft >= 60
      ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
      : `${minsLeft}m left`;

  const Icon = breached ? AlertTriangle : Clock;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium",
      tone,
      compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
    )}>
      <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
    </span>
  );
}
