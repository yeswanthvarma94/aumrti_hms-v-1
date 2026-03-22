import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import type { OTRoom, OTSchedule } from "@/pages/ot/OTPage";

interface Props {
  rooms: OTRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  selectedDate: string;
  onDateChange: (dir: number) => void;
  onSetToday: () => void;
  schedules: OTSchedule[];
  selectedScheduleId: string | null;
  onSelectSchedule: (id: string) => void;
  onBookSlot: (time?: string) => void;
  loading: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700" },
  confirmed: { bg: "bg-emerald-50", border: "border-l-emerald-500", text: "text-emerald-700" },
  in_progress: { bg: "bg-orange-50", border: "border-l-orange-500", text: "text-orange-700" },
  completed: { bg: "bg-slate-50", border: "border-l-slate-400", text: "text-slate-500" },
  cancelled: { bg: "bg-rose-50", border: "border-l-rose-500", text: "text-rose-500" },
  postponed: { bg: "bg-amber-50", border: "border-l-amber-500", text: "text-amber-600" },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed ✓",
  in_progress: "🔴 LIVE",
  completed: "Done",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

const OTSchedulePanel: React.FC<Props> = ({
  rooms, selectedRoomId, onSelectRoom, selectedDate, onDateChange, onSetToday,
  schedules, selectedScheduleId, onSelectSchedule, onBookSlot, loading,
}) => {
  const counts = {
    scheduled: schedules.filter((s) => s.status === "scheduled" || s.status === "confirmed").length,
    in_progress: schedules.filter((s) => s.status === "in_progress").length,
    completed: schedules.filter((s) => s.status === "completed").length,
    cancelled: schedules.filter((s) => s.status === "cancelled").length,
  };

  const totalAvailMin = 14 * 60; // 7 AM - 9 PM
  const totalUsedMin = schedules
    .filter((s) => ["completed", "in_progress"].includes(s.status))
    .reduce((sum, s) => sum + s.estimated_duration_minutes, 0);
  const utilization = totalAvailMin > 0 ? Math.round((totalUsedMin / totalAvailMin) * 100) : 0;

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const slotHeight = 36;
  const baseMin = 7 * 60;

  return (
    <div className="w-80 flex-shrink-0 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">OT Schedule</span>
          <button
            onClick={() => onBookSlot()}
            className="flex items-center gap-1 bg-[hsl(var(--sidebar-accent))] text-white text-[11px] font-semibold px-3 py-1.5 rounded-md hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={14} /> Book OT
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => onDateChange(-1)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors active:scale-95">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[13px] font-medium text-foreground flex-1 text-center">
            {format(parseISO(selectedDate), "EEEE, dd MMM yyyy")}
          </span>
          <button onClick={() => onDateChange(1)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors active:scale-95">
            <ChevronRight size={14} />
          </button>
          <button onClick={onSetToday} className="text-[11px] text-primary font-medium hover:underline">Today</button>
        </div>
      </div>

      {/* Room tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border flex-shrink-0 overflow-x-auto">
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelectRoom(r.id)}
            className={cn(
              "text-xs px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors active:scale-95",
              selectedRoomId === r.id
                ? "bg-[hsl(var(--sidebar-accent))] text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Day stats */}
      <div className="flex gap-3 px-3 py-1.5 border-b border-border bg-muted/30 flex-shrink-0 text-[11px] text-muted-foreground">
        <span>🔵 {counts.scheduled} Scheduled</span>
        <span>🟢 {counts.in_progress} Live</span>
        <span>✓ {counts.completed} Done</span>
        <span>🔴 {counts.cancelled} Cancelled</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-2 py-1 relative">
        <div style={{ height: HOURS.length * 2 * slotHeight, position: "relative" }}>
          {HOURS.map((h) => (
            <div key={h} style={{ position: "absolute", top: (h - 7) * 2 * slotHeight, width: "100%" }}>
              <div className="flex items-start">
                <span className="text-[10px] text-muted-foreground w-10 text-right pr-2 pt-0.5">
                  {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
                </span>
                <div className="flex-1 border-t border-dashed border-border" />
              </div>
            </div>
          ))}

          {/* Surgery blocks */}
          {schedules.map((s) => {
            const startMin = timeToMinutes(s.scheduled_start_time);
            const top = ((startMin - baseMin) / 30) * slotHeight;
            const height = (s.estimated_duration_minutes / 30) * slotHeight;
            const colors = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;

            return (
              <div
                key={s.id}
                className={cn(
                  "absolute left-10 right-1 rounded-r-md border-l-[3px] cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
                  colors.bg, colors.border,
                  selectedScheduleId === s.id && "ring-2 ring-primary/30",
                  s.status === "completed" && "opacity-70",
                  s.status === "cancelled" && "opacity-60"
                )}
                style={{ top: Math.max(top, 0), height: Math.max(height, slotHeight), zIndex: 10 }}
                onClick={() => onSelectSchedule(s.id)}
              >
                <div className="px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold truncate", s.status === "cancelled" && "line-through")}>
                      {s.surgery_name}
                    </span>
                    <span className="text-[9px] text-muted-foreground ml-1 whitespace-nowrap">
                      {s.estimated_duration_minutes}m
                    </span>
                  </div>
                  {height > slotHeight && (
                    <>
                      <p className="text-[11px] text-foreground/80 truncate">{s.patient?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">Dr. {s.surgeon?.full_name}</p>
                    </>
                  )}
                  <span className={cn("text-[9px] font-medium", colors.text)}>
                    {s.status === "in_progress" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />}
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">Today's utilization</span>
          <span className="text-[11px] font-bold text-foreground">{utilization}%</span>
        </div>
        <Progress value={utilization} className="h-1" />
      </div>
    </div>
  );
};

export default OTSchedulePanel;
