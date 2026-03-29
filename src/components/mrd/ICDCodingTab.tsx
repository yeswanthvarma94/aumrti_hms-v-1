import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  coded: "bg-blue-100 text-blue-700",
  validated: "bg-green-100 text-green-700",
  billed: "bg-gray-100 text-gray-600",
};

interface AISuggestion {
  primary_code: string;
  primary_description: string;
  confidence: number;
  secondary_suggestions?: { code: string; description: string }[];
  reasoning?: string;
}

interface Props {
  hospitalId: string;
  onRefresh?: () => void;
}

const ICDCodingTab: React.FC<Props> = ({ hospitalId, onRefresh }) => {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [primaryCode, setPrimaryCode] = useState("");
  const [primaryDesc, setPrimaryDesc] = useState("");
  const [pcsCode, setPcsCode] = useState("");
  const [saving, setSaving] = useState(false);

  // AI suggestion state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);

  useEffect(() => { if (hospitalId) fetchItems(); }, [filter, hospitalId]);

  const fetchItems = async () => {
    if (!hospitalId) return;
    setLoading(true);
    let query = (supabase as any).from("icd_codings").select("*").eq("hospital_id", hospitalId).order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) { toast.error(error.message); setLoading(false); return; }
    setItems(data || []);
    setLoading(false);
  };

  const suggestICDCode = useCallback(async (item: any) => {
    if (!item.visit_id || !item.visit_type || !hospitalId) return;
    if (item.ai_suggestion) return;

    setAiLoading(true);
    setAiSuggestion(null);
    setAiDismissed(false);

    try {
      const { data, error } = await supabase.functions.invoke("ai-icd-suggest", {
        body: { visit_type: item.visit_type, visit_id: item.visit_id, hospital_id: hospitalId },
      });

      if (error) {
        console.error("ICD AI error:", error);
        toast.error("AI suggestion failed — enter code manually");
        setAiLoading(false);
        return;
      }

      if (data?.error) {
        console.error("ICD AI error:", data.error);
        if (data.error.includes("No clinical notes")) {
          toast.info("No clinical notes found for AI suggestion");
        } else {
          toast.error(data.error);
        }
        setAiLoading(false);
        return;
      }

      const parsed: AISuggestion = data;

      // Save to DB
      await (supabase as any).from("icd_codings").update({
        ai_suggestion: parsed.primary_code,
        ai_confidence: parsed.confidence,
      }).eq("id", item.id);

      setAiSuggestion(parsed);
    } catch (e) {
      console.error("ICD suggestion failed:", e);
      toast.error("AI suggestion failed");
    }
    setAiLoading(false);
  }, [hospitalId]);

  const selectItem = (item: any) => {
    setSelected(item);
    setPrimaryCode(item.primary_icd_code || "");
    setPrimaryDesc(item.primary_icd_desc || "");
    setPcsCode(item.pcs_code || "");
    setAiDismissed(false);

    if (item.ai_suggestion) {
      setAiSuggestion({
        primary_code: item.ai_suggestion,
        primary_description: item.primary_icd_desc || item.ai_suggestion,
        confidence: item.ai_confidence || 0,
      });
      setAiLoading(false);
    } else {
      setAiSuggestion(null);
      if (item.status === "pending") {
        suggestICDCode(item);
      }
    }
  };

  const acceptAll = () => {
    if (!aiSuggestion) return;
    setPrimaryCode(aiSuggestion.primary_code);
    setPrimaryDesc(aiSuggestion.primary_description);
    toast.success("AI suggestion accepted");
  };

  const acceptPrimaryOnly = () => {
    if (!aiSuggestion) return;
    setPrimaryCode(aiSuggestion.primary_code);
    setPrimaryDesc(aiSuggestion.primary_description);
    toast.success("Primary code accepted");
  };

  const saveCoding = async (validate = false) => {
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: userData } = await (supabase as any).from("users").select("id").eq("auth_user_id", user.id).single();

    const updates: any = {
      primary_icd_code: primaryCode,
      primary_icd_desc: primaryDesc,
      pcs_code: pcsCode || null,
    };

    if (validate) {
      updates.status = "validated";
      updates.validated_by = userData?.id;
      updates.validated_at = new Date().toISOString();
    } else {
      updates.status = "coded";
      updates.coded_by = userData?.id;
      updates.coded_at = new Date().toISOString();
    }

    const { error } = await (supabase as any).from("icd_codings").update(updates).eq("id", selected.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(validate ? "Coding validated ✓" : "Coding saved");
    setSelected(null);
    setAiSuggestion(null);
    setSaving(false);
    fetchItems();
    onRefresh?.();
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-green-700";
    if (c >= 0.6) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="flex gap-3 h-full">
      {/* Left panel - queue */}
      <div className="w-[300px] flex flex-col border rounded-lg bg-card">
        <Tabs value={filter} onValueChange={setFilter} className="p-2">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 text-xs">Pending</TabsTrigger>
            <TabsTrigger value="coded" className="flex-1 text-xs">Coded</TabsTrigger>
            <TabsTrigger value="validated" className="flex-1 text-xs">Validated</TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <ScrollArea className="flex-1">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No items</p>
          ) : items.map((item) => (
            <button
              key={item.id}
              onClick={() => selectItem(item)}
              className={`w-full text-left px-3 py-2 border-b hover:bg-muted/50 transition-colors ${selected?.id === item.id ? "bg-muted" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{item.visit_type?.toUpperCase() || "—"}</span>
                <Badge variant="secondary" className={`text-[10px] ${statusColors[item.status]}`}>{item.status}</Badge>
              </div>
              {item.ai_suggestion && (
                <div className="text-[10px] text-accent-foreground mt-1 flex items-center gap-1">
                  <Bot className="h-3 w-3" /> AI: {item.ai_suggestion} ({Math.round((item.ai_confidence || 0) * 100)}%)
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Right panel - workspace */}
      <div className="flex-1 border rounded-lg bg-card p-4 overflow-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a coding item from the queue
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">ICD Coding Workspace</h3>

            {/* AI Loading State */}
            {aiLoading && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-foreground" />
                <span className="text-sm text-accent-foreground">🤖 Analysing clinical notes...</span>
              </div>
            )}

            {/* AI Suggestion Box */}
            {aiSuggestion && !aiDismissed && !aiLoading && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-accent-foreground" />
                  <span className="text-sm font-semibold text-accent-foreground">AI Suggestion</span>
                </div>
                <div className="text-sm font-bold">
                  {aiSuggestion.primary_code} — {aiSuggestion.primary_description}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <Progress value={(aiSuggestion.confidence || 0) * 100} className="h-2 flex-1 max-w-[200px]" />
                  <span className={`text-xs font-medium ${confidenceColor(aiSuggestion.confidence)}`}>
                    {Math.round((aiSuggestion.confidence || 0) * 100)}%
                  </span>
                </div>
                {aiSuggestion.reasoning && (
                  <p className="text-xs italic text-muted-foreground">{aiSuggestion.reasoning}</p>
                )}
                {aiSuggestion.secondary_suggestions && aiSuggestion.secondary_suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {aiSuggestion.secondary_suggestions.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {s.code} — {s.description}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs" onClick={acceptAll}>
                    <Check className="h-3 w-3 mr-1" /> Accept All
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={acceptPrimaryOnly}>
                    Accept Primary Only
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => setAiDismissed(true)}>
                    <X className="h-3 w-3 mr-1" /> Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Primary ICD-10 */}
            <div className="space-y-2">
              <Label className="text-xs">Primary ICD-10 Code</Label>
              <Input value={primaryCode} onChange={(e) => setPrimaryCode(e.target.value)} placeholder="e.g. J18.9" />
              <Input value={primaryDesc} onChange={(e) => setPrimaryDesc(e.target.value)} placeholder="Description" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Procedure Code (PCS)</Label>
              <Input value={pcsCode} onChange={(e) => setPcsCode(e.target.value)} placeholder="Optional procedure code" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => saveCoding(false)} disabled={saving || !primaryCode}>
                Save Coding
              </Button>
              <Button size="sm" variant="outline" onClick={() => saveCoding(true)} disabled={saving || !primaryCode}>
                Validate & Finalise
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ICDCodingTab;
