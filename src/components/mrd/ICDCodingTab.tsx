import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  coded: "bg-blue-100 text-blue-700",
  validated: "bg-green-100 text-green-700",
  billed: "bg-gray-100 text-gray-600",
};

const ICDCodingTab: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [primaryCode, setPrimaryCode] = useState("");
  const [primaryDesc, setPrimaryDesc] = useState("");
  const [pcsCode, setPcsCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, [filter]);

  const fetchItems = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userData } = await (supabase as any).from("users").select("hospital_id").eq("auth_user_id", user.id).single();
    if (!userData) return;

    let query = (supabase as any).from("icd_codings").select("*").eq("hospital_id", userData.hospital_id).order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) { toast.error(error.message); setLoading(false); return; }
    setItems(data || []);
    setLoading(false);
  };

  const selectItem = (item: any) => {
    setSelected(item);
    setPrimaryCode(item.primary_icd_code || "");
    setPrimaryDesc(item.primary_icd_desc || "");
    setPcsCode(item.pcs_code || "");
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
    toast.success(validate ? "Coding validated" : "Coding saved");
    setSelected(null);
    setSaving(false);
    fetchItems();
  };

  const acceptAI = () => {
    if (!selected?.ai_suggestion) return;
    setPrimaryCode(selected.ai_suggestion);
    setPrimaryDesc(`AI-suggested: ${selected.ai_suggestion}`);
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
                <div className="text-[10px] text-teal-600 mt-1 flex items-center gap-1">
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

            {/* AI Suggestion Box */}
            {selected.ai_suggestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-700">AI Suggests: {selected.ai_suggestion}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Confidence: {Math.round((selected.ai_confidence || 0) * 100)}%
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={acceptAI}>
                    <Check className="h-3 w-3 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                    <X className="h-3 w-3 mr-1" /> Reject
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

            {/* PCS Code */}
            <div className="space-y-2">
              <Label className="text-xs">Procedure Code (PCS)</Label>
              <Input value={pcsCode} onChange={(e) => setPcsCode(e.target.value)} placeholder="Optional procedure code" />
            </div>

            {/* Actions */}
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
