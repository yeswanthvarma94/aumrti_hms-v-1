import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHospitalId } from "@/hooks/useHospitalId";

const SYSTEMS = ["ayurveda", "yoga", "unani", "siddha", "homeopathy"];

interface Row {
  system: string;
  newPatients: number;
  revisitPatients: number;
  totalOPD: number;
  totalIPD: number;
  procedures: number;
}

export default function MoAyushReportTab() {
  const { hospitalId } = useHospitalId();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (hospitalId) load(); }, [hospitalId, month]);

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const start = `${month}-01`;
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().slice(0, 10);

      // All encounters for the month
      const { data: encounters } = await (supabase as any)
        .from("ayush_encounters")
        .select("system, patient_id, encounter_date")
        .eq("hospital_id", hospitalId)
        .gte("encounter_date", start)
        .lt("encounter_date", end);

      // Panchakarma procedures done in month
      const { data: pk } = await (supabase as any)
        .from("panchakarma_schedules")
        .select("id, scheduled_date, status")
        .eq("hospital_id", hospitalId)
        .gte("scheduled_date", start)
        .lt("scheduled_date", end)
        .eq("status", "completed");

      // Prior encounters (to identify revisits)
      const { data: priorEnc } = await (supabase as any)
        .from("ayush_encounters")
        .select("system, patient_id")
        .eq("hospital_id", hospitalId)
        .lt("encounter_date", start);

      const priorSet = new Set<string>();
      (priorEnc || []).forEach((e: any) => priorSet.add(`${e.system}|${e.patient_id}`));

      const result: Row[] = SYSTEMS.map((sys) => {
        const sysEnc = (encounters || []).filter((e: any) => e.system === sys);
        const seen = new Set<string>();
        let newP = 0, rev = 0;
        sysEnc.forEach((e: any) => {
          const key = `${sys}|${e.patient_id}`;
          if (seen.has(key)) return;
          seen.add(key);
          if (priorSet.has(key)) rev++; else newP++;
        });
        return {
          system: sys,
          newPatients: newP,
          revisitPatients: rev,
          totalOPD: sysEnc.length,
          totalIPD: 0, // AYUSH IPD not separately tracked yet
          procedures: sys === "ayurveda" ? (pk?.length || 0) : 0,
        };
      });
      setRows(result);
    } catch (e: any) {
      toast.error(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const header = ["System", "New Patients", "Revisit Patients", "Total OPD", "Total IPD", "Procedures Done"];
    const lines = [header.join(",")];
    rows.forEach(r => {
      lines.push([r.system, r.newPatients, r.revisitPatients, r.totalOPD, r.totalIPD, r.procedures].join(","));
    });
    const totals = rows.reduce((acc, r) => ({
      n: acc.n + r.newPatients, rv: acc.rv + r.revisitPatients,
      o: acc.o + r.totalOPD, i: acc.i + r.totalIPD, p: acc.p + r.procedures
    }), { n: 0, rv: 0, o: 0, i: 0, p: 0 });
    lines.push(["TOTAL", totals.n, totals.rv, totals.o, totals.i, totals.p].join(","));

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MoAYUSH_Report_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("MoAYUSH report exported");
  };

  const totals = rows.reduce((acc, r) => ({
    n: acc.n + r.newPatients, rv: acc.rv + r.revisitPatients,
    o: acc.o + r.totalOPD, i: acc.i + r.totalIPD, p: acc.p + r.procedures
  }), { n: 0, rv: 0, o: 0, i: 0, p: 0 });

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      <Card>
        <CardContent className="p-3 flex items-end gap-3">
          <div>
            <Label className="text-xs">Reporting Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          </div>
          <Button onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export for MoAYUSH Portal
          </Button>
          <div className="ml-auto flex items-center text-xs text-muted-foreground">
            <FileText className="h-4 w-4 mr-1" /> Ministry of AYUSH monthly format
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System</TableHead>
                  <TableHead className="text-right">New Patients</TableHead>
                  <TableHead className="text-right">Revisit Patients</TableHead>
                  <TableHead className="text-right">Total OPD</TableHead>
                  <TableHead className="text-right">Total IPD</TableHead>
                  <TableHead className="text-right">Procedures Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.system}>
                    <TableCell className="capitalize font-medium">{r.system}</TableCell>
                    <TableCell className="text-right font-mono">{r.newPatients}</TableCell>
                    <TableCell className="text-right font-mono">{r.revisitPatients}</TableCell>
                    <TableCell className="text-right font-mono">{r.totalOPD}</TableCell>
                    <TableCell className="text-right font-mono">{r.totalIPD}</TableCell>
                    <TableCell className="text-right font-mono">{r.procedures}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{totals.n}</TableCell>
                  <TableCell className="text-right font-mono">{totals.rv}</TableCell>
                  <TableCell className="text-right font-mono">{totals.o}</TableCell>
                  <TableCell className="text-right font-mono">{totals.i}</TableCell>
                  <TableCell className="text-right font-mono">{totals.p}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
