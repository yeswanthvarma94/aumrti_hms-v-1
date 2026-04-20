import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHospitalId } from "@/hooks/useHospitalId";

const IcmrReportTab = () => {
  const { hospitalId } = useHospitalId();
  const [year, setYear] = useState(new Date().getFullYear());
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const { data, error } = await supabase
      .from("ivf_cycles")
      .select("*, art_couples(female_patient_id, patients!art_couples_female_patient_id_fkey(date_of_birth))")
      .eq("hospital_id", hospitalId)
      .gte("created_at", start)
      .lte("created_at", `${end} 23:59:59`);
    if (error) {
      console.error(error);
      toast.error("Failed to load cycles");
    }
    setCycles(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hospitalId, year]);

  const stats = useMemo(() => {
    const total = cycles.length;
    const byType: Record<string, number> = {};
    const ageGroups = { "<30": 0, "30-34": 0, "35-39": 0, "40-44": 0, "≥45": 0 };
    let cancelled = 0;
    let positive = 0;
    let negative = 0;
    let donorEgg = 0;
    let donorSperm = 0;
    let fresh = 0;
    let frozen = 0;
    let liveBirths = 0;

    cycles.forEach((c: any) => {
      byType[c.cycle_type] = (byType[c.cycle_type] || 0) + 1;
      if (c.status === "cancelled") cancelled++;
      if (c.status === "positive") positive++;
      if (c.status === "negative") negative++;
      if (c.cycle_type === "fet") frozen++;
      else if (["ivf", "icsi"].includes(c.cycle_type)) fresh++;
      if (c.cycle_type === "donor_egg") donorEgg++;
      if (c.cycle_type === "donor_sperm") donorSperm++;
      if (c.delivery_outcome === "delivered") liveBirths++;

      const dob = c.art_couples?.patients?.date_of_birth;
      if (dob) {
        const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
        if (age < 30) ageGroups["<30"]++;
        else if (age < 35) ageGroups["30-34"]++;
        else if (age < 40) ageGroups["35-39"]++;
        else if (age < 45) ageGroups["40-44"]++;
        else ageGroups["≥45"]++;
      }
    });

    return { total, byType, ageGroups, cancelled, positive, negative, donorEgg, donorSperm, fresh, frozen, liveBirths };
  }, [cycles]);

  const handleExportCSV = () => {
    const rows = [
      ["ICMR ART Annual Registry Report", `Year: ${year}`],
      [],
      ["SECTION 1: Cycle Volume"],
      ["Total ART cycles initiated", stats.total],
      ["Cycles cancelled", stats.cancelled],
      ["Cancellation rate (%)", stats.total ? ((stats.cancelled / stats.total) * 100).toFixed(2) : 0],
      [],
      ["SECTION 2: Cycle Type Breakdown"],
      ["Cycle Type", "Count"],
      ...Object.entries(stats.byType).map(([k, v]) => [k.toUpperCase(), v]),
      [],
      ["SECTION 3: Age Group of Female Partner"],
      ["Age Group", "Count"],
      ...Object.entries(stats.ageGroups).map(([k, v]) => [k, v]),
      [],
      ["SECTION 4: Embryo Transfer Outcomes"],
      ["Fresh transfers (IVF/ICSI)", stats.fresh],
      ["Frozen transfers (FET)", stats.frozen],
      ["Clinical pregnancies (positive)", stats.positive],
      ["Negative outcomes", stats.negative],
      ["Live births", stats.liveBirths],
      [],
      ["SECTION 5: Donor Gamete Usage"],
      ["Donor egg cycles", stats.donorEgg],
      ["Donor sperm cycles", stats.donorSperm],
    ];
    const csv = rows.map(r => r.map(c => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `icmr_art_registry_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ICMR registry CSV exported");
  };

  const Section = ({ title, children }: any) => (
    <Card className="p-4">
      <h4 className="text-sm font-bold text-primary mb-3 border-b pb-2">{title}</h4>
      {children}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">ICMR ART Annual Registry Report</h3>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            {[0, 1, 2, 3].map(i => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <Button size="sm" onClick={handleExportCSV}>📥 Export CSV (ICMR Format)</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Section title="Section 1 — Cycle Volume">
            <Table>
              <TableBody>
                <TableRow><TableCell>Total ART cycles initiated</TableCell><TableCell className="text-right font-mono font-bold">{stats.total}</TableCell></TableRow>
                <TableRow><TableCell>Cycles cancelled</TableCell><TableCell className="text-right font-mono">{stats.cancelled}</TableCell></TableRow>
                <TableRow><TableCell>Cancellation rate</TableCell><TableCell className="text-right font-mono">{stats.total ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}%</TableCell></TableRow>
              </TableBody>
            </Table>
          </Section>

          <Section title="Section 2 — Cycle Type Breakdown">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(stats.byType).length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground text-xs">No cycles</TableCell></TableRow>
                ) : Object.entries(stats.byType).map(([k, v]) => (
                  <TableRow key={k}><TableCell className="uppercase font-mono text-xs">{k}</TableCell><TableCell className="text-right font-mono">{v}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Section 3 — Age Group of Female Partner">
            <Table>
              <TableHeader><TableRow><TableHead>Age</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(stats.ageGroups).map(([k, v]) => (
                  <TableRow key={k}><TableCell className="font-mono text-xs">{k}</TableCell><TableCell className="text-right font-mono">{v}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Section 4 — Embryo Transfer Outcomes">
            <Table>
              <TableBody>
                <TableRow><TableCell>Fresh transfers (IVF/ICSI)</TableCell><TableCell className="text-right font-mono">{stats.fresh}</TableCell></TableRow>
                <TableRow><TableCell>Frozen transfers (FET)</TableCell><TableCell className="text-right font-mono">{stats.frozen}</TableCell></TableRow>
                <TableRow><TableCell>Clinical pregnancies</TableCell><TableCell className="text-right font-mono text-green-700">{stats.positive}</TableCell></TableRow>
                <TableRow><TableCell>Negative outcomes</TableCell><TableCell className="text-right font-mono">{stats.negative}</TableCell></TableRow>
                <TableRow><TableCell>Live births</TableCell><TableCell className="text-right font-mono font-bold text-green-700">{stats.liveBirths}</TableCell></TableRow>
              </TableBody>
            </Table>
          </Section>

          <Section title="Section 5 — Donor Gamete Usage">
            <Table>
              <TableBody>
                <TableRow><TableCell>Donor egg cycles</TableCell><TableCell className="text-right font-mono">{stats.donorEgg}</TableCell></TableRow>
                <TableRow><TableCell>Donor sperm cycles</TableCell><TableCell className="text-right font-mono">{stats.donorSperm}</TableCell></TableRow>
              </TableBody>
            </Table>
          </Section>

          <Card className="p-4 bg-muted/30">
            <h4 className="text-xs font-semibold mb-2">📋 ICMR Compliance Note</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Per ICMR ART Act 2021, all ART clinics must submit annual registry data
              to the National ART & Surrogacy Registry. Use the "Export CSV" button to
              download data in the prescribed format and upload to the ICMR portal.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default IcmrReportTab;
