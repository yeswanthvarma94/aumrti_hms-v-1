import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockDoctors = [
  { id: "1", name: "Dr. Rajesh Kumar", specialty: "Cardiology", hasSchedule: true },
  { id: "2", name: "Dr. Priya Sharma", specialty: "Orthopaedics", hasSchedule: true },
  { id: "3", name: "Dr. Anil Mehta", specialty: "General Medicine", hasSchedule: false },
  { id: "4", name: "Dr. Sunita Reddy", specialty: "Gynaecology", hasSchedule: true },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Session { start: string; end: string; maxPatients: number; slotDuration: number; }

const SettingsDoctorSchedulesPage: React.FC = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [sessions, setSessions] = useState<Session[]>([
    { start: "09:00", end: "13:00", maxPatients: 30, slotDuration: 15 },
    { start: "17:00", end: "20:00", maxPatients: 20, slotDuration: 15 },
  ]);
  const [fee, setFee] = useState("500");
  const [advanceDays, setAdvanceDays] = useState("30");

  const doctor = mockDoctors.find((d) => d.id === selected);
  const filtered = mockDoctors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => toast({ title: `Schedule saved for ${doctor?.name}` });

  return (
    <SettingsPageWrapper title="Doctor Schedules" hideSave>
      <div className="flex gap-6 -mx-4">
        <div className="w-[260px] flex-shrink-0 border-r border-border pr-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctors..." className="pl-9 h-9" />
          </div>
          <div className="space-y-1">
            {filtered.map((d) => (
              <button key={d.id} onClick={() => setSelected(d.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === d.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{d.specialty}</span>
                  <Badge variant={d.hasSchedule ? "default" : "destructive"} className="text-[10px] h-4">{d.hasSchedule ? "Set" : "Not set"}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {!doctor ? (
            <div className="text-center py-20 text-muted-foreground text-sm">Select a doctor to edit their schedule</div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-foreground">{doctor.name} — Schedule</h2>

              <section>
                <Label className="mb-2 block">Working Days</Label>
                <div className="flex gap-2">
                  {days.map((d) => (
                    <label key={d} className="flex items-center gap-1.5 text-sm">
                      <Checkbox checked={workingDays.includes(d)} onCheckedChange={(v) => setWorkingDays(v ? [...workingDays, d] : workingDays.filter((x) => x !== d))} />
                      {d}
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <Label>OPD Sessions</Label>
                  <Button size="sm" variant="outline" onClick={() => setSessions([...sessions, { start: "", end: "", maxPatients: 20, slotDuration: 15 }])} className="gap-1 h-7"><Plus size={12} /> Add Session</Button>
                </div>
                {sessions.map((s, i) => (
                  <div key={i} className="flex gap-3 items-center mb-2">
                    <Input type="time" value={s.start} onChange={(e) => { const n = [...sessions]; n[i].start = e.target.value; setSessions(n); }} className="h-8 w-28" />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="time" value={s.end} onChange={(e) => { const n = [...sessions]; n[i].end = e.target.value; setSessions(n); }} className="h-8 w-28" />
                    <Input type="number" value={s.maxPatients} onChange={(e) => { const n = [...sessions]; n[i].maxPatients = +e.target.value; setSessions(n); }} className="h-8 w-20" placeholder="Max" />
                    <Input type="number" value={s.slotDuration} onChange={(e) => { const n = [...sessions]; n[i].slotDuration = +e.target.value; setSessions(n); }} className="h-8 w-20" placeholder="Min" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSessions(sessions.filter((_, j) => j !== i))}><Trash2 size={13} /></Button>
                  </div>
                ))}
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Consultation Fee (₹)</Label>
                  <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Advance Booking (days)</Label>
                  <Input type="number" value={advanceDays} onChange={(e) => setAdvanceDays(e.target.value)} className="mt-1.5" />
                </div>
              </div>

              <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Schedule</Button>
            </div>
          )}
        </div>
      </div>
    </SettingsPageWrapper>
  );
};

export default SettingsDoctorSchedulesPage;
