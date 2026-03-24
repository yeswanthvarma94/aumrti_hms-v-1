import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CAPA {
  id: string;
  capa_number: string;
  trigger_type: string;
  problem_statement: string;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  why_1: string | null;
  why_2: string | null;
  why_3: string | null;
  why_4: string | null;
  why_5: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  verified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const CAPATrackerTab: React.FC = () => {
  const { toast } = useToast();
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CAPA | null>(null);

  useEffect(() => {
    loadCAPAs();
  }, []);

  const loadCAPAs = async () => {
    const { data } = await supabase.from("capa_records").select("*").order("created_at", { ascending: false });
    setCAPAs((data as any) || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("capa_records").update({ status, ...(status === "completed" ? { completed_date: new Date().toISOString().split("T")[0] } : {}) }).eq("id", id);
    toast({ title: `CAPA ${status.replace("_", " ")}` });
    setSelected(null);
    loadCAPAs();
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">CAPA Tracker</h3>

      <div className="grid grid-cols-5 gap-3 mb-4">
        {["open", "in_progress", "completed", "verified", "closed"].map((s) => (
          <div key={s} className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-foreground">{capas.filter((c) => c.status === s).length}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{s.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">CAPA #</th>
              <th className="text-left px-3 py-2 font-medium">Trigger</th>
              <th className="text-left px-3 py-2 font-medium">Problem</th>
              <th className="text-left px-3 py-2 font-medium">Due Date</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {capas.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(c)}>
                <td className="px-3 py-2 font-mono font-medium text-foreground">{c.capa_number}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className="text-[9px]">{c.trigger_type.replace("_", " ")}</Badge>
                </td>
                <td className="px-3 py-2 max-w-[250px] truncate">{c.problem_statement}</td>
                <td className="px-3 py-2">{c.due_date ? new Date(c.due_date).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className={`text-[9px] ${statusColors[c.status] || ""}`}>
                    {c.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]">View</Button>
                </td>
              </tr>
            ))}
            {capas.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No CAPAs raised yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">CAPA: {selected?.capa_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-[10px]">Problem Statement</Label>
                <p className="mt-1 text-foreground">{selected.problem_statement}</p>
              </div>
              {/* 5-Why Analysis */}
              <div>
                <Label className="text-[10px]">5-Why Analysis</Label>
                <div className="space-y-1 mt-1">
                  {[selected.why_1, selected.why_2, selected.why_3, selected.why_4, selected.why_5]
                    .filter(Boolean)
                    .map((w, i) => (
                      <p key={i} className="text-muted-foreground">Why {i + 1}: {w}</p>
                    ))}
                  {![selected.why_1, selected.why_2, selected.why_3, selected.why_4, selected.why_5].some(Boolean) && (
                    <p className="text-muted-foreground italic">Not documented yet</p>
                  )}
                </div>
              </div>
              {selected.root_cause && (
                <div>
                  <Label className="text-[10px]">Root Cause</Label>
                  <p className="mt-1">{selected.root_cause}</p>
                </div>
              )}
              {selected.corrective_action && (
                <div>
                  <Label className="text-[10px]">Corrective Action</Label>
                  <p className="mt-1">{selected.corrective_action}</p>
                </div>
              )}
              {selected.preventive_action && (
                <div>
                  <Label className="text-[10px]">Preventive Action</Label>
                  <p className="mt-1">{selected.preventive_action}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selected.status === "open" && (
                  <Button size="sm" onClick={() => updateStatus(selected.id, "in_progress")}>Start Work</Button>
                )}
                {selected.status === "in_progress" && (
                  <Button size="sm" onClick={() => updateStatus(selected.id, "completed")}>Mark Completed</Button>
                )}
                {selected.status === "completed" && (
                  <Button size="sm" onClick={() => updateStatus(selected.id, "verified")}>Verify</Button>
                )}
                {selected.status === "verified" && (
                  <Button size="sm" onClick={() => updateStatus(selected.id, "closed")}>Close</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CAPATrackerTab;
