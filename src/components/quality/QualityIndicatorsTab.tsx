import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface Indicator {
  id: string;
  indicator_name: string;
  category: string;
  value: number;
  unit: string;
  target: number | null;
  auto_calculated: boolean;
  data_source: string | null;
}

const categoryColors: Record<string, string> = {
  clinical: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  operational: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  patient_safety: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  infection_control: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  nabh: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  financial: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const lowerIsBetter = new Set(["Medication Error Rate (per 1000 doses)", "Patient Fall Rate (per 1000 patient days)", "Hospital Acquired Infection Rate", "Readmission Rate within 30 days", "OT Cancellation Rate"]);

const QualityIndicatorsTab: React.FC = () => {
  const { toast } = useToast();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<Indicator | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadIndicators();
  }, []);

  const loadIndicators = async () => {
    const { data } = await supabase.from("quality_indicators").select("*").order("category");
    setIndicators((data as any) || []);
    setLoading(false);
  };

  const getValueColor = (ind: Indicator) => {
    if (!ind.target) return "text-foreground";
    const isLower = lowerIsBetter.has(ind.indicator_name);
    const diff = isLower ? ind.target - ind.value : ind.value - ind.target;
    const pctDiff = (diff / ind.target) * 100;
    if (isLower) {
      if (ind.value <= ind.target) return "text-green-600 dark:text-green-400";
      if (pctDiff >= -20) return "text-amber-600 dark:text-amber-400";
      return "text-red-600 dark:text-red-400";
    }
    if (ind.value >= ind.target) return "text-green-600 dark:text-green-400";
    if (pctDiff >= -20) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    const val = parseFloat(editValue);
    if (isNaN(val)) return;
    await supabase.from("quality_indicators").update({ value: val }).eq("id", editModal.id);
    toast({ title: "Indicator updated" });
    setEditModal(null);
    loadIndicators();
  };

  // Group by category
  const grouped = indicators.reduce<Record<string, Indicator[]>>((acc, ind) => {
    (acc[ind.category] = acc[ind.category] || []).push(ind);
    return acc;
  }, {});

  const sparkData = Array.from({ length: 6 }, (_, i) => ({ v: Math.random() * 50 + 30 }));

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {Object.entries(grouped).map(([cat, inds]) => (
        <div key={cat} className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {cat.replace("_", " ")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {inds.map((ind) => (
              <Card key={ind.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{ind.indicator_name}</p>
                      <Badge variant="secondary" className={`text-[9px] mt-1 ${categoryColors[ind.category] || ""}`}>
                        {ind.category.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className={`text-2xl font-bold ${getValueColor(ind)}`}>
                        {Number(ind.value).toFixed(ind.unit === "%" ? 0 : 1)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-0.5">{ind.unit}</span>
                      {ind.target && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Target: {Number(ind.target).toFixed(ind.unit === "%" ? 0 : 1)}{ind.unit}
                        </p>
                      )}
                    </div>
                    <div className="w-[80px] h-[40px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {!ind.auto_calculated && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs mt-2 w-full"
                      onClick={() => { setEditModal(ind); setEditValue(String(ind.value)); }}
                    >
                      Update Value
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Update: {editModal?.indicator_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Value ({editModal?.unit})</Label>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" size="sm">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityIndicatorsTab;
