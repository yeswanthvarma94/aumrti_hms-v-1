import React, { useEffect, useState } from "react";
import PeriodontalChart from "./PeriodontalChart";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface PeriodontalTabProps {
  patientId: string;
  hospitalId: string;
  userId: string | null;
}

interface HistoryRow {
  id: string;
  chart_date: string;
  diagnosis: string | null;
  bleeding_index: number | null;
}

const sevColor = (dx: string | null) => {
  switch (dx) {
    case "healthy": return "bg-emerald-500";
    case "gingivitis": return "bg-amber-500";
    case "stage1_perio": return "bg-orange-500";
    case "stage2_perio": return "bg-red-500";
    case "stage3_perio":
    case "stage4_perio": return "bg-red-700";
    default: return "bg-muted";
  }
};

const sevLabel = (dx: string | null) => {
  const map: Record<string,string> = {
    healthy: "Healthy",
    gingivitis: "Gingivitis",
    stage1_perio: "Mild Periodontitis",
    stage2_perio: "Moderate Periodontitis",
    stage3_perio: "Severe Periodontitis",
    stage4_perio: "Severe Periodontitis",
    peri_implantitis: "Peri-implantitis",
  };
  return dx ? (map[dx] ?? dx) : "—";
};

const PeriodontalTab: React.FC<PeriodontalTabProps> = ({ patientId, hospitalId, userId }) => {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("periodontal_charts")
        .select("id, chart_date, diagnosis, bleeding_index")
        .eq("patient_id", patientId)
        .eq("hospital_id", hospitalId)
        .order("chart_date", { ascending: false })
        .limit(10);
      setHistory((data as HistoryRow[]) || []);
    })();
  }, [patientId, hospitalId, reloadKey]);

  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
      <PeriodontalChart
        patientId={patientId}
        hospitalId={hospitalId}
        userId={userId}
        onSaved={() => setReloadKey(k => k + 1)}
      />

      <div className="bg-card rounded-lg border">
        <div className="px-3 py-2 border-b text-xs font-semibold">Historical charts</div>
        {history.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4">No previous charts.</div>
        ) : (
          <ul className="divide-y">
            {history.map(h => (
              <li key={h.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="font-mono">{new Date(h.chart_date).toLocaleDateString("en-IN")}</span>
                <span className="text-muted-foreground">BOP: {h.bleeding_index ?? 0}%</span>
                <Badge className={`text-[10px] text-white ${sevColor(h.diagnosis)}`}>{sevLabel(h.diagnosis)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PeriodontalTab;
