import React, { useState } from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Schedule { id: string; report: string; frequency: string; time: string; nextRun: string; recipients: string; format: string; active: boolean; }

const defaultSchedules: Schedule[] = [
  { id: "1", report: "Daily Collection Summary", frequency: "Daily", time: "08:00", nextRun: "Tomorrow 08:00", recipients: "CEO, Admin", format: "PDF", active: true },
  { id: "2", report: "Weekly Revenue Report", frequency: "Weekly", time: "09:00", nextRun: "Mon 09:00", recipients: "CEO, CFO", format: "Excel", active: true },
  { id: "3", report: "Monthly OPD Statistics", frequency: "Monthly", time: "07:00", nextRun: "1st Apr 07:00", recipients: "Admin, HOD", format: "Both", active: false },
];

const reportTypes = ["Daily Collection Summary", "Weekly Revenue Report", "Monthly OPD Statistics", "Monthly Payroll Summary", "NABH Quality Indicators", "Stock Expiry Alert", "Insurance AR Ageing"];

const SettingsReportSchedulesPage: React.FC = () => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState(defaultSchedules);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ report: reportTypes[0], frequency: "Daily", time: "08:00", recipients: "", format: "PDF" });

  const handleAdd = () => {
    setSchedules([...schedules, { id: Date.now().toString(), ...form, nextRun: "Pending", active: true }]);
    setShowAdd(false);
    toast({ title: "Report scheduled" });
  };

  return (
    <SettingsPageWrapper title="Scheduled Reports" hideSave>
      <p className="text-sm text-muted-foreground mb-4">Set up automatic reports delivered to your team.</p>

      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1"><Plus size={14} /> Schedule Report</Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 text-left">
            <th className="px-3 py-2 font-medium text-muted-foreground">Report</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Frequency</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Next Run</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Format</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Active</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium text-foreground">{s.report}</td>
                <td className="px-3 py-2.5"><Badge variant="outline">{s.frequency}</Badge></td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.nextRun}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.format}</td>
                <td className="px-3 py-2.5"><Switch checked={s.active} onCheckedChange={(v) => setSchedules(schedules.map((x) => x.id === s.id ? { ...x, active: v } : x))} /></td>
                <td className="px-3 py-2.5 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Run Now"><Play size={13} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSchedules(schedules.filter((x) => x.id !== s.id))}><Trash2 size={13} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Report Type</Label>
              <Select value={form.report} onValueChange={(v) => setForm({ ...form, report: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{reportTypes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>Recipients (roles)</Label><Input value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="CEO, Admin, HOD" className="mt-1" /></div>
            <div><Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Excel">Excel</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd}>Save Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageWrapper>
  );
};

export default SettingsReportSchedulesPage;
