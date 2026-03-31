import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

const HOSPITAL_ID = "8f3d08b3-8835-42a7-920e-fdf5a78260bc";
const STATIONS = ["Reception", "Vitals", "Lab", "ECG", "X-Ray", "USG", "Doctor", "Report"];

interface Props { onRefreshKPIs: () => void; }

export default function TodaysCheckupsTab({ onRefreshKPIs }: Props) {
  const [bookings, setBookings] = useState<any[]>([]);

  const load = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("package_bookings")
      .select("*, health_packages(package_name, components, total_components), patients(full_name, uhid, dob, gender)")
      .eq("hospital_id", HOSPITAL_ID)
      .eq("scheduled_date", today)
      .order("created_at");
    setBookings(data || []);
  };

  useEffect(() => { load(); }, []);

  const statusColors: Record<string, string> = {
    booked: "bg-slate-100 text-slate-700",
    checked_in: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    awaiting_report: "bg-purple-100 text-purple-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const checkIn = async (id: string) => {
    const { error } = await supabase.from("package_bookings").update({
      status: "checked_in", current_station: "Vitals",
    }).eq("id", id);
    if (error) { toast.error("Failed to check in"); return; }
    toast.success("Patient checked in");
    load(); onRefreshKPIs();
  };

  const advanceStation = async (booking: any) => {
    const components = Array.isArray(booking.health_packages?.components) ? booking.health_packages.components : [];
    const done = booking.components_done || {};
    const currentIdx = STATIONS.indexOf(booking.current_station || "Reception");
    const nextStation = STATIONS[currentIdx + 1] || "Report";
    const newDone = { ...done, [booking.current_station || "Reception"]: new Date().toISOString() };
    const totalDone = Object.keys(newDone).length;
    const isLast = nextStation === "Report" || currentIdx + 1 >= STATIONS.length - 1;

    const { error } = await supabase.from("package_bookings").update({
      components_done: newDone,
      current_station: nextStation,
      status: isLast ? "awaiting_report" : "in_progress",
    }).eq("id", booking.id);
    if (error) { toast.error("Failed to update station"); return; }
    toast.success(`Station complete → ${nextStation}`);
    load(); onRefreshKPIs();
  };

  return (
    <div className="space-y-3">
      {bookings.length === 0 && <p className="text-center text-muted-foreground py-8">No checkups scheduled for today</p>}
      {bookings.map((b) => {
        const done = b.components_done || {};
        const doneCount = Object.keys(done).length;
        const totalStations = STATIONS.length;
        const pct = Math.round((doneCount / totalStations) * 100);
        const patient = b.patients;
        const pkg = b.health_packages;

        return (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                   <p className="font-semibold">{patient?.full_name}</p>
                   <p className="text-xs text-muted-foreground">UHID: {patient?.uhid} • {patient?.gender}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{pkg?.package_name}</Badge>
                  <Badge className={statusColors[b.status] || ""}>{b.status.replace("_", " ")}</Badge>
                </div>
              </div>

              {/* Station Flow */}
              <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                {STATIONS.map((st, i) => {
                  const isDone = !!done[st];
                  const isCurrent = b.current_station === st;
                  return (
                    <div key={st} className="flex items-center">
                      {i > 0 && <div className={`w-4 h-px ${isDone ? "bg-emerald-500" : "bg-border"}`} />}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap ${
                        isDone ? "bg-emerald-50 text-emerald-700" : isCurrent ? "bg-blue-50 text-blue-700 font-medium" : "text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : isCurrent ? <PlayCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        {st}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <Progress value={pct} className="flex-1 h-2" />
                <span className="text-xs font-medium">{pct}%</span>
                {b.status === "booked" && <Button size="sm" onClick={() => checkIn(b.id)}>Check In</Button>}
                {(b.status === "checked_in" || b.status === "in_progress") && (
                  <Button size="sm" variant="outline" onClick={() => advanceStation(b)}>
                    Complete {b.current_station} →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
