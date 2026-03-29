import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Coins, Bot, Copy, Printer, AlertTriangle, Send } from "lucide-react";
import { callAI } from "@/lib/aiProvider";

interface Claim {
  id: string;
  patient_id: string;
  admission_id: string;
  scheme_id: string;
  claim_number: string | null;
  package_code: string;
  package_name: string;
  claimed_amount: number;
  approved_amount: number | null;
  settled_amount: number | null;
  status: string;
  denial_reason: string | null;
  denial_code: string | null;
  appeal_letter: string | null;
  is_resubmitted: boolean;
  submitted_at: string | null;
  settled_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-purple-50 text-purple-700",
  approved: "bg-emerald-50 text-emerald-700",
  partially_approved: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
  settled: "bg-emerald-50 text-emerald-700",
  appealed: "bg-orange-50 text-orange-700",
};

const PmjayClaimsTab: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Claim | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [appealModal, setAppealModal] = useState(false);
  const [appealText, setAppealText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("pmjay_claims").select("*").order("created_at", { ascending: false });
    const rows = (data || []) as Claim[];
    setClaims(rows);

    if (rows.length > 0) {
      const pIds = [...new Set(rows.map(r => r.patient_id))];
      const { data: pData } = await supabase.from("patients").select("id, full_name").in("id", pIds);
      setPatients(Object.fromEntries((pData || []).map(p => [p.id, p.full_name])));
    }
    setLoading(false);
  };

  const filtered = filter === "all" ? claims : claims.filter(c => c.status === filter);

  const generateAppeal = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const response = await callAI({
        featureKey: "appeal_letter",
        hospitalId: "",
        prompt: `Generate a formal medical necessity appeal letter for a denied insurance claim.
Patient: ${patients[selected.patient_id]}
Package: ${selected.package_name} (${selected.package_code})
Claimed Amount: ₹${selected.claimed_amount}
Denial Reason: ${selected.denial_reason || "Not specified"}
Denial Code: ${selected.denial_code || "N/A"}

Write a professional letter requesting reconsideration, including medical justification and referencing applicable guidelines. Format as a formal hospital letter.`,
        maxTokens: 800,
      });
      if (response && !response.error) {
        const text = response.text || (typeof response === "string" ? response : "");
        setAppealText(text);
        setAppealModal(true);
      }
    } catch {
      toast({ title: "Failed to generate appeal", variant: "destructive" });
    }
    setAiLoading(false);
  };

  const saveAppeal = async () => {
    if (!selected) return;
    await supabase.from("pmjay_claims").update({ appeal_letter: appealText }).eq("id", selected.id);
    toast({ title: "Appeal saved to claim" });
    setAppealModal(false);
    loadData();
  };

  const markResubmitted = async () => {
    if (!selected) return;
    await supabase.from("pmjay_claims").update({
      is_resubmitted: true,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", selected.id);
    toast({ title: "Claim resubmitted" });
    loadData();
    setSelected(null);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left */}
      <div className="w-[320px] border-r border-border bg-background flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold">Claims</h3>
          <div className="flex gap-1 mt-2 flex-wrap">
            {["all", "draft", "submitted", "approved", "rejected", "settled"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <Coins size={32} className="mx-auto mb-2 opacity-40" />
              No claims found
            </div>
          ) : filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)} className={cn(
              "w-full text-left p-3 rounded-lg border transition-colors",
              selected?.id === c.id ? "bg-primary/5 border-primary" : "border-border hover:bg-muted/50"
            )}>
              <div className="flex justify-between items-start">
                <span className="text-[13px] font-medium">{patients[c.patient_id] || "Unknown"}</span>
                <Badge variant="outline" className={cn("text-[9px] capitalize", statusColors[c.status])}>{c.status}</Badge>
              </div>
              <div className="text-[11px] mt-0.5">{c.package_name}</div>
              <div className="text-[11px] font-mono font-medium mt-0.5">₹{c.claimed_amount.toLocaleString("en-IN")}</div>
              {c.submitted_at && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Submitted {formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Coins size={40} className="opacity-30 mb-2" />
            <p className="text-sm">Select a claim</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold">{selected.package_name}</h3>
              <Badge className={cn("capitalize", statusColors[selected.status])}>{selected.status}</Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-[11px]">Patient</span><br/>{patients[selected.patient_id]}</div>
              <div><span className="text-muted-foreground text-[11px]">Claim #</span><br/>{selected.claim_number || "—"}</div>
              <div><span className="text-muted-foreground text-[11px]">Claimed</span><br/>₹{selected.claimed_amount.toLocaleString("en-IN")}</div>
              <div><span className="text-muted-foreground text-[11px]">Approved</span><br/>{selected.approved_amount ? `₹${selected.approved_amount.toLocaleString("en-IN")}` : "—"}</div>
              <div><span className="text-muted-foreground text-[11px]">Settled</span><br/>{selected.settled_amount ? `₹${selected.settled_amount.toLocaleString("en-IN")}` : "—"}</div>
              <div><span className="text-muted-foreground text-[11px]">Resubmitted</span><br/>{selected.is_resubmitted ? "Yes" : "No"}</div>
            </div>

            {/* Denial section */}
            {selected.status === "rejected" && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                  <AlertTriangle size={16} /> Claim Rejected
                </div>
                {selected.denial_code && <div className="text-[12px]"><strong>Code:</strong> {selected.denial_code}</div>}
                <div className="text-[12px]"><strong>Reason:</strong> {selected.denial_reason || "Not specified"}</div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={generateAppeal} disabled={aiLoading}>
                    <Bot size={13} /> {aiLoading ? "Generating..." : "Generate Appeal Letter"}
                  </Button>
                  <Button size="sm" className="gap-1" onClick={markResubmitted}>
                    <Send size={13} /> Mark Resubmitted
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      <Dialog open={appealModal} onOpenChange={setAppealModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Generated Appeal Letter</DialogTitle>
          </DialogHeader>
          <Textarea className="min-h-[300px] font-mono text-sm" value={appealText} onChange={e => setAppealText(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(appealText)}>
              <Copy size={13} className="mr-1" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer size={13} className="mr-1" /> Print
            </Button>
            <Button size="sm" onClick={saveAppeal}>Save to Claim</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PmjayClaimsTab;
