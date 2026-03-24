import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Incident {
  id: string;
  incident_number: string;
  incident_date: string;
  incident_type: string;
  severity: string;
  description: string;
  status: string;
  immediate_action: string | null;
}

const severityColors: Record<string, string> = {
  minor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  major: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  sentinel: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  capa_raised: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  closed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface Props {
  onFileIncident: () => void;
}

const IncidentReportsTab: React.FC<Props> = ({ onFileIncident }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("incident_reports").select("*").order("incident_date", { ascending: false });
      setIncidents((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incident Reports</h3>
        <Button size="sm" variant="outline" onClick={onFileIncident}>+ File Incident</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Open", count: incidents.filter((i) => i.status === "open").length, color: "text-red-600" },
          { label: "Under Review", count: incidents.filter((i) => i.status === "under_review").length, color: "text-amber-600" },
          { label: "CAPA Raised", count: incidents.filter((i) => i.status === "capa_raised").length, color: "text-blue-600" },
          { label: "Closed", count: incidents.filter((i) => i.status === "closed").length, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Incident #</th>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Severity</th>
              <th className="text-left px-3 py-2 font-medium">Description</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-mono font-medium text-foreground">{inc.incident_number}</td>
                <td className="px-3 py-2">{new Date(inc.incident_date).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className="text-[9px]">{inc.incident_type.replace("_", " ")}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className={`text-[9px] ${severityColors[inc.severity] || ""}`}>
                    {inc.severity}
                  </Badge>
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate">{inc.description}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className={`text-[9px] ${statusColors[inc.status] || ""}`}>
                    {inc.status.replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No incidents reported yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentReportsTab;
