import React, { useState, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-accent/10 text-accent-foreground",
  approved: "bg-success/10 text-success",
  issued: "bg-primary/10 text-primary",
  partially_issued: "bg-accent/10 text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const IndentsPanel: React.FC = () => {
  const { toast } = useToast();
  const [indents, setIndents] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");

  const loadIndents = async () => {
    const { data } = await (supabase as any)
      .from("department_indents")
      .select("*, departments(name), users!department_indents_requested_by_fkey(full_name)")
      .order("created_at", { ascending: false });
    setIndents(data || []);
  };

  useEffect(() => { loadIndents(); }, []);

  const filtered = filter === "all" ? indents : indents.filter((i) => i.status === filter);

  const updateStatus = async (id: string, status: string) => {
    const { data: userData } = await supabase.from("users").select("id").limit(1).single();
    await (supabase as any).from("department_indents").update({
      status,
      approved_by: userData?.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: `Indent ${status}` });
    loadIndents();
  };

  const tabs = ["pending", "approved", "issued", "rejected", "all"];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-shrink-0 bg-card border-b border-border px-4 py-2.5 flex items-center gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={cn("px-3 py-1 rounded-full text-[10px] font-medium capitalize transition-colors", filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {t} {t !== "all" && `(${indents.filter((i) => i.status === t).length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Indent #</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Department</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Requested By</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Required Date</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((indent) => (
              <tr key={indent.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono font-semibold text-foreground">{indent.indent_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{indent.departments?.name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{indent.users?.full_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{indent.required_date || "—"}</td>
                <td className="px-3 py-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full capitalize", statusColors[indent.status] || "bg-muted text-muted-foreground")}>
                    {indent.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {indent.status === "pending" && (
                    <div className="flex gap-1 justify-center">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-success" onClick={() => updateStatus(indent.id, "approved")}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={() => updateStatus(indent.id, "rejected")}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {indent.status === "approved" && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => updateStatus(indent.id, "issued")}>
                      Issue Items
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No indents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IndentsPanel;
