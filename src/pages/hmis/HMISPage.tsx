import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Bug, Baby, Plus, AlertTriangle, Download, Eye, ClipboardList } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const HMISPage: React.FC = () => {
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ thisMonth: 0, submitted: 0, pending: 0, idspAlerts: 0 });
  const [showIdspModal, setShowIdspModal] = useState(false);

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const curWeek = getWeekNumber(now);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.from("users").select("hospital_id").limit(1).maybeSingle();
      const hid = u?.hospital_id;
      if (!hid) return;
      setHospitalId(hid);

      const [reportsRes, idspRes] = await Promise.all([
        supabase.from("hmis_reports").select("*").eq("hospital_id", hid).order("created_at", { ascending: false }).limit(50),
        supabase.from("idsp_alerts").select("id", { count: "exact", head: true }).eq("hospital_id", hid).eq("year", curYear),
      ]);

      const allReports = reportsRes.data || [];
      setReports(allReports);

      const thisMonthReports = allReports.filter((r: any) => r.period_year === curYear && r.period_month === curMonth);
      const submitted = allReports.filter((r: any) => r.status === "submitted" || r.status === "accepted");
      const pending = allReports.filter((r: any) => r.status === "draft" || r.status === "generated");

      setKpis({
        thisMonth: thisMonthReports.length,
        submitted: submitted.length,
        pending: pending.length,
        idspAlerts: idspRes.count || 0,
      });
    };
    load();
  }, []);

  const generateReport = async (reportType: string, month?: number, week?: number) => {
    if (!hospitalId) return;
    const { error } = await supabase.from("hmis_reports").insert({
      hospital_id: hospitalId,
      report_type: reportType,
      period_month: month || null,
      period_week: week || null,
      period_year: curYear,
      status: "draft",
      generated_at: new Date().toISOString(),
      report_data: {},
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Report generated (draft)");
    // Reload
    const { data } = await supabase.from("hmis_reports").select("*").eq("hospital_id", hospitalId).order("created_at", { ascending: false }).limit(50);
    setReports(data || []);
  };

  // Find current status for each report type
  const getStatus = (type: string, month?: number, week?: number) => {
    const match = reports.find((r: any) => {
      if (r.report_type !== type || r.period_year !== curYear) return false;
      if (month && r.period_month !== month) return false;
      if (week && r.period_week !== week) return false;
      return true;
    });
    return match?.status || null;
  };

  const hmisStatus = getStatus("monthly_hmis", curMonth);
  const idspStatus = getStatus("weekly_idsp_p", undefined, curWeek);
  const rmnchaStatus = getStatus("rmncha_monthly", curMonth);

  const statusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" className="text-[10px] bg-gray-50">Not Generated</Badge>;
    const colors: Record<string, string> = {
      draft: "bg-amber-100 text-amber-800",
      generated: "bg-blue-100 text-blue-800",
      submitted: "bg-emerald-100 text-emerald-800",
      accepted: "bg-emerald-500 text-white",
    };
    return <Badge className={`text-[10px] ${colors[status] || ""}`}>{status}</Badge>;
  };

  const kpiCards = [
    { label: "Reports This Month", value: kpis.thisMonth, color: "text-primary", bg: "bg-primary/5" },
    { label: "Submitted", value: kpis.submitted, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending", value: kpis.pending, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "IDSP Alerts", value: kpis.idspAlerts, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card" style={{ height: 52 }}>
        <h1 className="text-base font-bold text-foreground">📊 Govt HMIS Reporting</h1>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={() => generateReport("monthly_hmis", curMonth)}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Generate Report
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowIdspModal(true)}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> IDSP Alert
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3 px-4 py-2" style={{ height: 72 }}>
        {kpiCards.map(k => (
          <div key={k.label} className={`${k.bg} rounded-lg p-3 flex flex-col justify-center`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{k.label}</p>
            <p className={`text-xl font-bold ${k.color} font-mono`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {/* 3 Report Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Monthly HMIS */}
          <Card className="p-5 border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">📋 MoHFW Monthly HMIS</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Due: 5th of every month</p>
                <div className="mt-2">{statusBadge(hmisStatus)}</div>
                <Button size="sm" className="mt-3 h-8 text-xs w-full" variant={hmisStatus ? "outline" : "default"}
                  onClick={() => generateReport("monthly_hmis", curMonth)}>
                  Generate {MONTHS[curMonth - 1]} Report →
                </Button>
              </div>
            </div>
          </Card>

          {/* IDSP Weekly */}
          <Card className="p-5 border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Bug className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">🦠 IDSP Disease Surveillance</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Due: Every Monday (P-form) + confirmed (L-form)</p>
                <div className="mt-2">{statusBadge(idspStatus)}</div>
                <Button size="sm" className="mt-3 h-8 text-xs w-full" variant={idspStatus ? "outline" : "default"}
                  onClick={() => generateReport("weekly_idsp_p", undefined, curWeek)}>
                  Generate Week {curWeek} P-Form →
                </Button>
              </div>
            </div>
          </Card>

          {/* RMNCH+A */}
          <Card className="p-5 border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                <Baby className="h-5 w-5 text-pink-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">🤰 RMNCH+A Maternal & Child</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Due: 5th of every month</p>
                <div className="mt-2">{statusBadge(rmnchaStatus)}</div>
                <Button size="sm" className="mt-3 h-8 text-xs w-full" variant={rmnchaStatus ? "outline" : "default"}
                  onClick={() => generateReport("rmncha_monthly", curMonth)}>
                  Generate Report →
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* History Table */}
        <Card className="border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Report History</h3>
          </div>
          <div className="overflow-auto max-h-[280px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Report Type</TableHead>
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs">Generated</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">
                      {r.report_type === "monthly_hmis" ? "Monthly HMIS" :
                       r.report_type === "weekly_idsp_p" ? "IDSP P-Form" :
                       r.report_type === "weekly_idsp_l" ? "IDSP L-Form" :
                       r.report_type === "rmncha_monthly" ? "RMNCH+A" :
                       r.report_type}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.period_month ? `${MONTHS[r.period_month - 1]} ${r.period_year}` :
                       r.period_week ? `W${r.period_week} ${r.period_year}` :
                       r.period_year}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.generated_at ? format(new Date(r.generated_at), "dd/MM/yyyy HH:mm") : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Download className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">No reports generated yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* IDSP Alert Modal */}
      {showIdspModal && hospitalId && <IDSPAlertModal hospitalId={hospitalId} onClose={() => setShowIdspModal(false)} week={curWeek} year={curYear} />}
    </div>
  );
};

const IDSPAlertModal: React.FC<{ hospitalId: string; onClose: () => void; week: number; year: number }> = ({ hospitalId, onClose, week, year }) => {
  const [disease, setDisease] = useState("");
  const [syndrome, setSyndrome] = useState("");
  const [casesOpd, setCasesOpd] = useState("0");
  const [casesIpd, setCasesIpd] = useState("0");
  const [deaths, setDeaths] = useState("0");
  const [isOutbreak, setIsOutbreak] = useState(false);
  const [notes, setNotes] = useState("");

  const DISEASES = ["Acute Diarrhoeal Disease","Typhoid","Cholera","Viral Hepatitis","Dengue","Chikungunya","Malaria","Leptospirosis","Acute Encephalitis Syndrome","Meningitis","Measles","Diphtheria","Pertussis","Chicken Pox","Other"];

  const save = async () => {
    if (!disease) { toast.error("Select a disease"); return; }
    const { error } = await supabase.from("idsp_alerts").insert({
      hospital_id: hospitalId, alert_date: new Date().toISOString().split("T")[0],
      disease, syndrome: syndrome || null,
      cases_opd: parseInt(casesOpd) || 0, cases_ipd: parseInt(casesIpd) || 0,
      deaths: parseInt(deaths) || 0, week_number: week, year,
      is_outbreak: isOutbreak, notes: notes || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("IDSP alert recorded");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">IDSP Disease Alert — W{week}/{year}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={disease} onValueChange={setDisease}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select disease" /></SelectTrigger>
            <SelectContent>{DISEASES.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Syndrome (optional)" value={syndrome} onChange={e => setSyndrome(e.target.value)} className="h-8 text-xs" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">OPD Cases</label>
              <Input type="number" value={casesOpd} onChange={e => setCasesOpd(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">IPD Cases</label>
              <Input type="number" value={casesIpd} onChange={e => setCasesIpd(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Deaths</label>
              <Input type="number" value={deaths} onChange={e => setDeaths(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isOutbreak} onChange={e => setIsOutbreak(e.target.checked)} className="rounded" />
            <span className="text-red-600 font-semibold">⚠️ Mark as Outbreak</span>
          </label>
          <Textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="text-xs h-16" />
        </div>
        <DialogFooter><Button size="sm" className="text-xs" onClick={save}>Save Alert</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((d.getTime() - onejan.getTime()) / 86400000);
  return Math.ceil(dayOfYear / 7);
}

export default HMISPage;
