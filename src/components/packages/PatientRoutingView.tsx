import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, PlayCircle, Activity, FlaskConical, Stethoscope, Scan, ArrowRight, Loader2 } from "lucide-react";
import { Suspense, lazy } from "react";
const QRCodeSVG = lazy(() => import("qrcode.react").then(m => ({ default: m.QRCodeSVG })));

interface Station {
  order: number;
  station: string;
  module: string;
  duration_min: number;
}

interface Progress {
  status?: "pending" | "in_progress" | "completed" | "skipped";
  started_at?: string;
  completed_at?: string;
}

interface Props {
  bookingId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const moduleIcon = (mod: string) => {
  switch (mod) {
    case "nursing": return Activity;
    case "lab": return FlaskConical;
    case "radiology": return Scan;
    case "opd": return Stethoscope;
    default: return Clock;
  }
};

export default function PatientRoutingView({ bookingId, open, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("package_bookings")
      .select("*, health_packages(package_name, stations), patients(full_name, uhid)")
      .eq("id", bookingId)
      .maybeSingle();
    setLoading(false);
    if (error || !data) { toast.error("Failed to load booking"); return; }
    setBooking(data);
    const sts: Station[] = Array.isArray((data.health_packages as any)?.stations)
      ? (data.health_packages as any).stations
      : [];
    sts.sort((a, b) => a.order - b.order);
    setStations(sts);
    setProgress(((data as any).station_progress as Record<string, Progress>) || {});
  };

  useEffect(() => { if (open && bookingId) load(); }, [open, bookingId]);

  const statusOf = (st: Station): Progress["status"] => {
    const p = progress[st.station];
    if (p?.status) return p.status;
    if (booking?.current_station === st.station) return "in_progress";
    return "pending";
  };

  const markComplete = async (st: Station) => {
    setSaving(st.station);
    const now = new Date().toISOString();
    const newProgress: Record<string, Progress> = {
      ...progress,
      [st.station]: { ...(progress[st.station] || {}), status: "completed", completed_at: now },
    };
    const idx = stations.findIndex(s => s.station === st.station);
    const next = stations[idx + 1];
    if (next) {
      newProgress[next.station] = { ...(newProgress[next.station] || {}), status: "in_progress", started_at: now };
    }
    const isLast = !next;
    const { error } = await supabase.from("package_bookings").update({
      station_progress: newProgress as any,
      current_station: next ? next.station : st.station,
      status: isLast ? "awaiting_report" : "in_progress",
    }).eq("id", bookingId);
    setSaving(null);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`${st.station} complete${next ? ` → ${next.station}` : ""}`);
    setProgress(newProgress);
    setBooking({ ...booking, current_station: next ? next.station : st.station });
    onUpdated?.();
  };

  const startStation = async (st: Station) => {
    setSaving(st.station);
    const newProgress: Record<string, Progress> = {
      ...progress,
      [st.station]: { status: "in_progress", started_at: new Date().toISOString() },
    };
    const { error } = await supabase.from("package_bookings").update({
      station_progress: newProgress as any,
      current_station: st.station,
      status: "in_progress",
    }).eq("id", bookingId);
    setSaving(null);
    if (error) { toast.error("Failed"); return; }
    setProgress(newProgress);
    setBooking({ ...booking, current_station: st.station });
    onUpdated?.();
  };

  const remainingMins = stations
    .filter(s => statusOf(s) !== "completed" && statusOf(s) !== "skipped")
    .reduce((sum, s) => sum + (s.duration_min || 0), 0);
  const completedCount = stations.filter(s => statusOf(s) === "completed").length;
  const pct = stations.length > 0 ? Math.round((completedCount / stations.length) * 100) : 0;

  const qrUrl = typeof window !== "undefined"
    ? `${window.location.origin}/packages?booking=${bookingId}`
    : "";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Routing — Multi-Department Pipeline</DialogTitle>
        </DialogHeader>

        {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}

        {!loading && booking && (
          <div className="space-y-4">
            {/* Header info + QR */}
            <div className="flex items-start justify-between gap-4 p-3 bg-muted/40 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-base">{booking.patients?.full_name}</p>
                <p className="text-xs text-muted-foreground">UHID: {booking.patients?.uhid}</p>
                <p className="text-sm mt-1">{booking.health_packages?.package_name}</p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span><b>{completedCount}</b>/{stations.length} stations</span>
                  <span>•</span>
                  <span><b>{pct}%</b> complete</span>
                  <span>•</span>
                  <span>~<b>{remainingMins}</b> min remaining</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="bg-background p-2 rounded border">
                  <Suspense fallback={<div style={{ width: 88, height: 88 }} className="bg-muted animate-pulse rounded" />}>
                    <QRCodeSVG value={qrUrl} size={88} />
                  </Suspense>
                </div>
                <p className="text-[10px] text-muted-foreground">Scan to open</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>

            {/* Station cards */}
            {stations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No stations configured for this package. Edit the package to add a routing pipeline.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 items-stretch">
                {stations.map((st, i) => {
                  const status = statusOf(st);
                  const Icon = moduleIcon(st.module);
                  const p = progress[st.station] || {};
                  const isCurrent = status === "in_progress";
                  const isDone = status === "completed";

                  return (
                    <div key={st.order} className="flex items-stretch">
                      <Card className={`p-3 w-44 flex flex-col gap-2 ${
                        isDone ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30" :
                        isCurrent ? "bg-blue-50 border-blue-400 dark:bg-blue-950/30 ring-2 ring-blue-400 animate-pulse" :
                        "bg-background"
                      }`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${
                            isDone ? "text-emerald-600" :
                            isCurrent ? "text-blue-600" : "text-muted-foreground"
                          }`} />
                          <span className="text-xs font-mono text-muted-foreground">#{st.order}</span>
                          {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
                          {isCurrent && <PlayCircle className="h-4 w-4 text-blue-600 ml-auto" />}
                        </div>
                        <p className="font-medium text-sm leading-tight">{st.station}</p>
                        <Badge variant="outline" className="w-fit text-[10px] capitalize">{st.module}</Badge>
                        <p className="text-[10px] text-muted-foreground">⏱ {st.duration_min} min</p>

                        {isDone && p.completed_at && (
                          <p className="text-[10px] text-emerald-700">
                            ✓ {new Date(p.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}

                        {isCurrent && (
                          <Button size="sm" className="h-7 text-xs" disabled={saving === st.station}
                            onClick={() => markComplete(st)}>
                            {saving === st.station ? "..." : "Mark Complete"}
                          </Button>
                        )}
                        {!isDone && !isCurrent && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={saving === st.station}
                            onClick={() => startStation(st)}>
                            Start
                          </Button>
                        )}
                      </Card>
                      {i < stations.length - 1 && (
                        <div className="flex items-center px-1">
                          <ArrowRight className={`h-4 w-4 ${isDone ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
