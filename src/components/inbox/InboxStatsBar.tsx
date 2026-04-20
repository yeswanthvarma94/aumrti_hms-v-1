import { useMemo } from "react";

interface Msg {
  direction: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  sla_deadline: string | null;
}

export default function InboxStatsBar({ messages }: { messages: Msg[] }) {
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = messages.filter(m => new Date(m.created_at).getTime() >= weekAgo);
    const inbound = recent.filter(m => m.direction === "inbound");
    const open = inbound.filter(m => m.status !== "resolved" && m.status !== "closed");
    const resolved = inbound.filter(m => !!m.resolved_at);

    const respHours =
      resolved.length === 0
        ? 0
        : resolved.reduce((sum, m) => {
            const diff = new Date(m.resolved_at!).getTime() - new Date(m.created_at).getTime();
            return sum + diff / (1000 * 60 * 60);
          }, 0) / resolved.length;

    const withSla = inbound.filter(m => m.sla_deadline);
    const breached = withSla.filter(m => {
      if (m.resolved_at) {
        return new Date(m.resolved_at).getTime() > new Date(m.sla_deadline!).getTime();
      }
      return new Date(m.sla_deadline!).getTime() < Date.now();
    });
    const compliance = withSla.length === 0
      ? 100
      : Math.round(((withSla.length - breached.length) / withSla.length) * 100);

    return {
      open: open.length,
      avgResp: respHours.toFixed(1),
      compliance,
      breached: breached.length,
    };
  }, [messages]);

  const cells = [
    { label: "Open", value: stats.open, tone: "text-foreground" },
    { label: "Avg response", value: `${stats.avgResp} hrs`, tone: "text-foreground" },
    { label: "SLA compliance", value: `${stats.compliance}%`, tone: stats.compliance >= 90 ? "text-emerald-600" : stats.compliance >= 70 ? "text-amber-600" : "text-destructive" },
    { label: "Breached", value: stats.breached, tone: stats.breached > 0 ? "text-destructive" : "text-foreground" },
  ];

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/40 text-xs">
      {cells.map((c, i) => (
        <div key={c.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{c.label}:</span>
          <span className={`font-bold ${c.tone}`}>{c.value}</span>
          {i < cells.length - 1 && <span className="text-muted-foreground/40 ml-3">|</span>}
        </div>
      ))}
      <span className="ml-auto text-[10px] text-muted-foreground">Last 7 days</span>
    </div>
  );
}
