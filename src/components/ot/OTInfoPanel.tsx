import React from "react";
import type { OTSchedule } from "@/pages/ot/OTPage";

interface Props {
  schedules: OTSchedule[];
  selectedDate: string;
  onSelectSchedule: (id: string) => void;
}

const OTInfoPanel: React.FC<Props> = ({ schedules, selectedDate, onSelectSchedule }) => {
  const total = schedules.length;
  const completed = schedules.filter((s) => s.status === "completed").length;
  const inProgress = schedules.filter((s) => s.status === "in_progress").length;
  const cancelled = schedules.filter((s) => s.status === "cancelled").length;

  const upcoming = schedules.filter((s) => ["scheduled", "confirmed"].includes(s.status))
    .sort((a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time));

  const stats = [
    { label: "Total Cases", value: total, color: "text-foreground" },
    { label: "Completed", value: completed, color: "text-emerald-600" },
    { label: "In Progress", value: inProgress, color: "text-orange-600" },
    { label: "Cancelled", value: cancelled, color: "text-destructive" },
  ];

  const borderColors: Record<string, string> = {
    scheduled: "border-l-slate-400",
    confirmed: "border-l-emerald-500",
  };

  return (
    <div className="w-[300px] flex-shrink-0 bg-card border-l border-border flex flex-col h-full overflow-hidden">
      {/* Today's summary */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Today's OT</p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-muted/50 rounded-md p-2">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming cases */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Upcoming Today</p>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No upcoming cases</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSchedule(s.id)}
                className={`w-full text-left bg-muted/30 rounded-lg p-2.5 border-l-[3px] ${borderColors[s.status] || "border-l-slate-300"} hover:bg-muted/60 transition-colors active:scale-[0.98]`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    {s.scheduled_start_time.slice(0, 5)}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground truncate mt-0.5">{s.surgery_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.patient?.full_name}</p>
                <p className="text-[11px] text-muted-foreground/70 truncate">Dr. {s.surgeon?.full_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <p className="text-[11px] font-bold uppercase text-muted-foreground/70 mb-2">Quick Actions</p>
        <div className="space-y-1.5">
          {["📋 OT List Today", "✅ WHO Compliance", "📅 Weekly View"].map((label) => (
            <button
              key={label}
              className="w-full text-left bg-muted text-foreground/80 text-xs px-3 py-2 rounded-md hover:bg-accent transition-colors active:scale-[0.98]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OTInfoPanel;
