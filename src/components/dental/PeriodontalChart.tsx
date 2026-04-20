import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const SITES = ["mb","b","db","ml","l","dl"] as const;
type Site = typeof SITES[number];

export type PerioToothData = Record<Site, number> & { bop: boolean };
export type PerioData = Record<number, PerioToothData>;

// Sextant ranges per FDI numbering
const SEXTANTS: { label: string; teeth: number[] }[] = [
  { label: "S1 (UR posterior)", teeth: [18,17,16,15,14] },
  { label: "S2 (Upper anterior)", teeth: [13,12,11,21,22,23] },
  { label: "S3 (UL posterior)", teeth: [24,25,26,27,28] },
  { label: "S4 (LL posterior)", teeth: [38,37,36,35,34] },
  { label: "S5 (Lower anterior)", teeth: [33,32,31,41,42,43] },
  { label: "S6 (LR posterior)", teeth: [44,45,46,47,48] },
];

const emptyTooth = (): PerioToothData => ({ mb:0, b:0, db:0, ml:0, l:0, dl:0, bop:false });

const buildEmpty = (): PerioData => {
  const d: PerioData = {};
  [...UPPER, ...LOWER].forEach(t => { d[t] = emptyTooth(); });
  return d;
};

const depthClass = (v: number) => {
  if (!v) return "border-input bg-background";
  if (v <= 3) return "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (v <= 5) return "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  return "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
};

interface Props {
  patientId: string;
  hospitalId: string;
  userId: string | null;
  encounterId?: string | null;
  initial?: PerioData;
  onSaved?: () => void;
}

const PeriodontalChart: React.FC<Props> = ({ patientId, hospitalId, userId, initial, onSaved }) => {
  const { toast } = useToast();
  const [data, setData] = useState<PerioData>(initial ?? buildEmpty());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const setVal = (tooth: number, site: Site, raw: string) => {
    const n = parseInt(raw.replace(/\D/g, "").slice(-1)) || 0;
    setData(prev => ({ ...prev, [tooth]: { ...prev[tooth], [site]: n > 9 ? 9 : n } }));
  };
  const toggleBop = (tooth: number) => {
    setData(prev => ({ ...prev, [tooth]: { ...prev[tooth], bop: !prev[tooth].bop } }));
  };

  const stats = useMemo(() => {
    let sum = 0, count = 0, sites4 = 0, sites6 = 0, bopSites = 0, bopTotal = 0;
    Object.values(data).forEach(t => {
      SITES.forEach(s => {
        const v = t[s];
        if (v > 0) { sum += v; count++; if (v >= 4) sites4++; if (v >= 6) sites6++; }
        bopTotal++;
      });
      if (t.bop) bopSites += 6;
    });
    const avg = count ? sum / count : 0;
    const bopPct = bopTotal ? (bopSites / bopTotal) * 100 : 0;

    let severity = "Healthy";
    if (sites6 > 0 && bopPct > 10) severity = "Severe Periodontitis";
    else if (sites6 > 0) severity = "Moderate Periodontitis";
    else if (sites4 > 0 && bopPct > 10) severity = "Mild Periodontitis";
    else if (bopPct > 10) severity = "Gingivitis";

    const sextants = SEXTANTS.map(sx => {
      let s = 0, c = 0;
      sx.teeth.forEach(t => SITES.forEach(site => { const v = data[t]?.[site] || 0; if (v > 0) { s += v; c++; } }));
      return { label: sx.label, avg: c ? s / c : 0 };
    });

    return { avg, sites4, sites6, bopPct, severity, sextants };
  }, [data]);

  const sevColor =
    stats.severity === "Healthy" ? "bg-emerald-500" :
    stats.severity === "Gingivitis" ? "bg-amber-500" :
    stats.severity === "Mild Periodontitis" ? "bg-orange-500" :
    stats.severity === "Moderate Periodontitis" ? "bg-red-500" : "bg-red-700";

  const handleSave = async () => {
    if (!userId) { toast({ title: "Please log in first", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const dxMap: Record<string,string> = {
        "Healthy": "healthy",
        "Gingivitis": "gingivitis",
        "Mild Periodontitis": "stage1_perio",
        "Moderate Periodontitis": "stage2_perio",
        "Severe Periodontitis": "stage3_perio",
      };
      const { error } = await supabase.from("periodontal_charts").insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        created_by: userId,
        chart_date: new Date().toISOString().split("T")[0],
        perio_data: data as any,
        bleeding_index: Math.round(stats.bopPct * 100) / 100,
        diagnosis: dxMap[stats.severity] || "healthy",
      });
      if (error) throw error;
      toast({ title: "Periodontal chart saved" });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Tab-key navigation: rely on natural DOM order. We render inputs in a stable order:
  // For each arch row → for each tooth → 3 buccal sites then 3 lingual sites.
  const renderTooth = (tooth: number) => {
    const t = data[tooth];
    return (
      <div key={tooth} className="flex flex-col items-center gap-1 px-1 py-2 border-r border-border last:border-r-0 min-w-[64px]">
        <span className="font-mono text-[10px] font-bold text-muted-foreground">{tooth}</span>
        {/* Buccal row: MB B DB */}
        <div className="flex gap-0.5">
          {(["mb","b","db"] as Site[]).map(s => (
            <input
              key={s}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={t[s] || ""}
              onChange={(e) => setVal(tooth, s, e.target.value)}
              title={`${s.toUpperCase()} (buccal)`}
              className={`w-5 h-6 text-center text-xs font-mono border rounded ${depthClass(t[s])} focus:ring-2 focus:ring-ring focus:outline-none`}
            />
          ))}
        </div>
        {/* BOP toggle */}
        <button
          type="button"
          onClick={() => toggleBop(tooth)}
          aria-label={`BOP tooth ${tooth}`}
          className={`w-3 h-3 rounded-full border ${t.bop ? "bg-red-500 border-red-600" : "bg-background border-muted-foreground/40"}`}
        />
        {/* Lingual row: ML L DL */}
        <div className="flex gap-0.5">
          {(["ml","l","dl"] as Site[]).map(s => (
            <input
              key={s}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={t[s] || ""}
              onChange={(e) => setVal(tooth, s, e.target.value)}
              title={`${s.toUpperCase()} (lingual/palatal)`}
              className={`w-5 h-6 text-center text-xs font-mono border rounded ${depthClass(t[s])} focus:ring-2 focus:ring-ring focus:outline-none`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" ref={formRef}>
      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">Avg PD: {stats.avg.toFixed(1)} mm</Badge>
        <Badge variant="outline" className="text-xs">Sites ≥4mm: {stats.sites4}</Badge>
        <Badge variant="outline" className="text-xs">Sites ≥6mm: {stats.sites6}</Badge>
        <Badge variant="outline" className="text-xs">BOP: {stats.bopPct.toFixed(1)}%</Badge>
        <Badge className={`text-xs text-white ${sevColor}`}>{stats.severity}</Badge>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-lg border p-3 overflow-x-auto">
        <div className="text-[10px] text-muted-foreground mb-1 px-2">
          Tip: Press <kbd className="px-1 border rounded">Tab</kbd> to move between sites. Top row = buccal (MB/B/DB), dot = BOP, bottom row = lingual/palatal (ML/L/DL).
        </div>
        {/* Upper arch */}
        <div className="text-[10px] uppercase text-muted-foreground mb-1 px-2">Upper arch (maxilla)</div>
        <div className="flex border rounded mb-3 bg-muted/10">
          {UPPER.map(renderTooth)}
        </div>
        {/* Lower arch */}
        <div className="text-[10px] uppercase text-muted-foreground mb-1 px-2">Lower arch (mandible)</div>
        <div className="flex border rounded bg-muted/10">
          {LOWER.map(renderTooth)}
        </div>
      </div>

      {/* Sextant averages */}
      <div className="bg-card rounded-lg border p-3">
        <div className="text-xs font-semibold mb-2">Sextant averages</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {stats.sextants.map(sx => (
            <div key={sx.label} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
              <span className="text-muted-foreground">{sx.label}</span>
              <span className="font-mono font-semibold">{sx.avg.toFixed(1)} mm</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save size={16} className="mr-2" />
        {saving ? "Saving..." : "Save Periodontal Chart"}
      </Button>
    </div>
  );
};

export default PeriodontalChart;
