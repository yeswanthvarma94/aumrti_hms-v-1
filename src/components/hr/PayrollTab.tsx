import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, CheckSquare, Loader2 } from "lucide-react";

interface PayrollRun {
  id: string;
  run_month: string;
  run_date: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  staff_count: number;
  status: string;
}

interface PayrollItem {
  id: string;
  user_id: string;
  full_name?: string;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical_allowance: number;
  overtime_amount: number;
  gross_salary: number;
  pf_employee: number;
  esic_employee: number;
  tds: number;
  total_deductions: number;
  net_salary: number;
  payment_status: string;
}

const PayrollTab: React.FC = () => {
  const { toast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [workingDays, setWorkingDays] = useState(26);
  const [calculatedItems, setCalculatedItems] = useState<PayrollItem[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [viewItems, setViewItems] = useState<PayrollItem[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);

  useEffect(() => {
    loadRuns();
  }, [selectedMonth]);

  const loadRuns = async () => {
    const { data } = await (supabase as any).from("payroll_runs").select("*").order("created_at", { ascending: false });
    setRuns(data || []);
  };

  const openRunModal = async () => {
    // Count staff and attendance for the month
    const { data: staff } = await (supabase as any).from("staff_profiles").select("user_id").eq("is_active", true);
    setStaffCount(staff?.length || 0);

    const monthStart = `${selectedMonth}-01`;
    const nextMonth = new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];

    const { data: att } = await (supabase as any)
      .from("staff_attendance")
      .select("user_id")
      .gte("attendance_date", monthStart)
      .lt("attendance_date", monthEnd);

    const uniqueUsers = new Set((att || []).map((a: any) => a.user_id));
    setAttendanceCount(uniqueUsers.size);

    // Calculate working days (exclude Sundays)
    const year = parseInt(selectedMonth.split("-")[0]);
    const month = parseInt(selectedMonth.split("-")[1]) - 1;
    let wd = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() !== 0) wd++;
    }
    setWorkingDays(wd);
    setCalculatedItems([]);
    setShowModal(true);
  };

  const calculatePayroll = async () => {
    setProcessing(true);
    try {
      const { data: profiles } = await (supabase as any)
        .from("staff_profiles")
        .select("*, users!staff_profiles_user_id_fkey(full_name)")
        .eq("is_active", true);

      if (!profiles?.length) {
        toast({ title: "No active staff profiles found", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const monthStart = `${selectedMonth}-01`;
      const nextMonth = new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 1);
      const monthEnd = nextMonth.toISOString().split("T")[0];

      const { data: allAttendance } = await (supabase as any)
        .from("staff_attendance")
        .select("user_id, status")
        .gte("attendance_date", monthStart)
        .lt("attendance_date", monthEnd);

      const items: PayrollItem[] = profiles.map((sp: any) => {
        const userAtt = (allAttendance || []).filter((a: any) => a.user_id === sp.user_id);
        const presentDays = userAtt.filter((a: any) => a.status === "present" || a.status === "late").length;
        const leaveDays = userAtt.filter((a: any) => a.status === "on_leave").length;
        const absentDays = workingDays - presentDays - leaveDays;
        const otHours = userAtt.reduce((sum: number, a: any) => sum + (parseFloat(a.overtime_hours) || 0), 0);

        const perDay = (sp.basic_salary || 0) / workingDays;
        const paidDays = presentDays + leaveDays;
        const basic = Math.round(paidDays * perDay * 100) / 100;
        const hra = Math.round(basic * ((sp.hra_percent || 20) / 100) * 100) / 100;
        const da = Math.round(basic * ((sp.da_percent || 10) / 100) * 100) / 100;
        const conv = absentDays > 3 ? Math.round((sp.conveyance || 1600) * (paidDays / workingDays) * 100) / 100 : (sp.conveyance || 1600);
        const med = sp.medical_allowance || 1250;
        const otAmount = Math.round(otHours * (perDay / 8) * 1.5 * 100) / 100;
        const gross = basic + hra + da + conv + med + otAmount;

        const pfEmp = sp.pf_applicable ? Math.round(basic * 0.12 * 100) / 100 : 0;
        const pfEr = sp.pf_applicable ? Math.round(basic * 0.12 * 100) / 100 : 0;
        const esicEmp = sp.esic_applicable ? Math.round(gross * 0.0075 * 100) / 100 : 0;
        const esicEr = sp.esic_applicable ? Math.round(gross * 0.0325 * 100) / 100 : 0;
        const totalDed = pfEmp + esicEmp;
        const net = Math.round((gross - totalDed) * 100) / 100;

        return {
          id: sp.id,
          user_id: sp.user_id,
          full_name: sp.users?.full_name || "Unknown",
          present_days: presentDays,
          absent_days: Math.max(0, absentDays),
          leave_days: leaveDays,
          overtime_hours: otHours,
          basic, hra, da, conveyance: conv, medical_allowance: med,
          overtime_amount: otAmount,
          gross_salary: gross,
          pf_employee: pfEmp,
          esic_employee: esicEmp,
          tds: 0,
          total_deductions: totalDed,
          net_salary: net,
          payment_status: "pending",
        };
      });

      setCalculatedItems(items);
    } catch (err) {
      toast({ title: "Error calculating payroll", variant: "destructive" });
    }
    setProcessing(false);
  };

  const savePayroll = async () => {
    setProcessing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from("users").select("id, hospital_id").eq("auth_user_id", user.user?.id || "").single();
      if (!currentUser) throw new Error("No user");

      const totalGross = calculatedItems.reduce((s, i) => s + i.gross_salary, 0);
      const totalDed = calculatedItems.reduce((s, i) => s + i.total_deductions, 0);
      const totalNet = calculatedItems.reduce((s, i) => s + i.net_salary, 0);

      const { data: run, error: runErr } = await (supabase as any).from("payroll_runs").insert({
        hospital_id: currentUser.hospital_id,
        run_month: selectedMonth,
        total_gross: totalGross,
        total_deductions: totalDed,
        total_net: totalNet,
        staff_count: calculatedItems.length,
        status: "processed",
        processed_by: currentUser.id,
      }).select().single();

      if (runErr) throw runErr;

      const items = calculatedItems.map((i) => ({
        hospital_id: currentUser.hospital_id,
        payroll_run_id: run.id,
        user_id: i.user_id,
        present_days: i.present_days,
        absent_days: i.absent_days,
        leave_days: i.leave_days,
        overtime_hours: i.overtime_hours,
        basic: i.basic, hra: i.hra, da: i.da,
        conveyance: i.conveyance, medical_allowance: i.medical_allowance,
        overtime_amount: i.overtime_amount,
        gross_salary: i.gross_salary,
        pf_employee: i.pf_employee, pf_employer: 0,
        esic_employee: i.esic_employee, esic_employer: 0,
        tds: i.tds, total_deductions: i.total_deductions,
        net_salary: i.net_salary,
        payment_status: "pending",
      }));

      await (supabase as any).from("payroll_items").insert(items);

      toast({ title: `Payroll processed for ${calculatedItems.length} staff` });
      setShowModal(false);
      setCalculatedItems([]);
      loadRuns();
    } catch (err: any) {
      toast({ title: "Error saving payroll: " + err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const viewRun = async (runId: string) => {
    const { data } = await (supabase as any)
      .from("payroll_items")
      .select("*, users!payroll_items_user_id_fkey(full_name)")
      .eq("payroll_run_id", runId);

    setViewItems((data || []).map((d: any) => ({ ...d, full_name: d.users?.full_name || "Unknown" })));
    setActiveRunId(runId);
  };

  const approveRun = async (runId: string) => {
    await (supabase as any).from("payroll_runs").update({ status: "approved" }).eq("id", runId);
    toast({ title: "Payroll approved" });
    loadRuns();
  };

  const toggleHold = async (itemId: string, current: string) => {
    const next = current === "hold" ? "pending" : "hold";
    await (supabase as any).from("payroll_items").update({ payment_status: next }).eq("id", itemId);
    if (activeRunId) viewRun(activeRunId);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const statusColor = (s: string) => {
    switch (s) {
      case "draft": return "secondary";
      case "processed": return "default";
      case "approved": return "default";
      case "paid": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 flex-shrink-0 bg-card border-b border-border flex items-center gap-3 px-5">
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-44 h-8 text-sm"
        />
        <Button size="sm" onClick={openRunModal}>
          <DollarSign className="h-4 w-4 mr-1" /> Run Payroll for {selectedMonth}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* Previous runs */}
        {runs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Payroll History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.run_month}</TableCell>
                    <TableCell>{r.staff_count}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_gross)}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_deductions)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.total_net)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => viewRun(r.id)}>View</Button>
                        {r.status === "processed" && (
                          <Button size="sm" variant="outline" onClick={() => approveRun(r.id)}>
                            <CheckSquare className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* View items for selected run */}
        {viewItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Payroll Details</h3>
              <Button size="sm" variant="ghost" onClick={() => { setViewItems([]); setActiveRunId(null); }}>Close</Button>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                    <TableHead className="text-right">ESIC</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.full_name}</TableCell>
                      <TableCell className="text-center text-xs">P:{item.present_days} A:{item.absent_days} L:{item.leave_days}</TableCell>
                      <TableCell className="text-right">{fmt(item.gross_salary)}</TableCell>
                      <TableCell className="text-right">{fmt(item.pf_employee)}</TableCell>
                      <TableCell className="text-right">{fmt(item.esic_employee)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(item.net_salary)}</TableCell>
                      <TableCell>
                        <Badge variant={item.payment_status === "hold" ? "destructive" : "secondary"}>
                          {item.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => toggleHold(item.id, item.payment_status)}>
                          {item.payment_status === "hold" ? "Release" : "Hold"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{fmt(viewItems.reduce((s, i) => s + i.gross_salary, 0))}</TableCell>
                    <TableCell className="text-right">{fmt(viewItems.reduce((s, i) => s + i.pf_employee, 0))}</TableCell>
                    <TableCell className="text-right">{fmt(viewItems.reduce((s, i) => s + i.esic_employee, 0))}</TableCell>
                    <TableCell className="text-right">{fmt(viewItems.reduce((s, i) => s + i.net_salary, 0))}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {runs.length === 0 && viewItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No payroll runs yet</p>
              <p className="text-xs mt-1">Click "Run Payroll" to process salaries</p>
            </div>
          </div>
        )}
      </div>

      {/* Run Payroll Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Payroll — {selectedMonth}</DialogTitle>
          </DialogHeader>

          {calculatedItems.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  Attendance marked for <span className="font-semibold text-foreground">{attendanceCount}</span> of{" "}
                  <span className="font-semibold text-foreground">{staffCount}</span> staff
                </p>
                {staffCount > attendanceCount && (
                  <p className="text-xs text-destructive">
                    Missing attendance for {staffCount - attendanceCount} staff — will be treated as absent
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Working days this month:</label>
                <Input
                  type="number"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(parseInt(e.target.value) || 26)}
                  className="w-20 h-8"
                />
              </div>
              <Button onClick={calculatePayroll} disabled={processing} className="w-full">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Calculate Payroll →
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-auto max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-center">P/A/L</TableHead>
                      <TableHead className="text-right">Basic</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">PF</TableHead>
                      <TableHead className="text-right">ESIC</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedItems.map((item) => (
                      <TableRow key={item.user_id}>
                        <TableCell className="font-medium text-sm">{item.full_name}</TableCell>
                        <TableCell className="text-center text-xs">{item.present_days}/{item.absent_days}/{item.leave_days}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(item.basic)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(item.gross_salary)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(item.pf_employee)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(item.esic_employee)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{fmt(item.net_salary)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL ({calculatedItems.length} staff)</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{fmt(calculatedItems.reduce((s, i) => s + i.basic, 0))}</TableCell>
                      <TableCell className="text-right">{fmt(calculatedItems.reduce((s, i) => s + i.gross_salary, 0))}</TableCell>
                      <TableCell className="text-right">{fmt(calculatedItems.reduce((s, i) => s + i.pf_employee, 0))}</TableCell>
                      <TableCell className="text-right">{fmt(calculatedItems.reduce((s, i) => s + i.esic_employee, 0))}</TableCell>
                      <TableCell className="text-right">{fmt(calculatedItems.reduce((s, i) => s + i.net_salary, 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCalculatedItems([])} className="flex-1">← Recalculate</Button>
                <Button onClick={savePayroll} disabled={processing} className="flex-1">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save & Process Payroll
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollTab;
