import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { callAI } from "@/lib/aiProvider";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { BedDouble, Brain, Loader2 } from "lucide-react";

interface Props {
  hospitalId: string;
  totalBeds: number;
  currentOccupancy: number;
}

interface ForecastDay {
  day: string;
  expected_beds_needed: number;
  available: number;
}

interface ForecastResult {
  forecast: ForecastDay[];
  peak_day: string;
  shortage_risk: boolean;
  recommended_action: string;
}

const BedForecastCard: React.FC<Props> = ({ hospitalId, totalBeds, currentOccupancy }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);

  const runForecast = async () => {
    setLoading(true);
    try {
      // Get 30-day admission/discharge counts
      const { data: admData } = await supabase
        .from("admissions")
        .select("admitted_at, discharged_at")
        .eq("hospital_id", hospitalId)
        .gte("admitted_at", new Date(Date.now() - 30 * 86400000).toISOString());

      const dailyMap: Record<string, { admissions: number; discharges: number }> = {};
      (admData || []).forEach((a: any) => {
        const admDay = a.admitted_at?.split("T")[0];
        if (admDay) {
          if (!dailyMap[admDay]) dailyMap[admDay] = { admissions: 0, discharges: 0 };
          dailyMap[admDay].admissions++;
        }
        if (a.discharged_at) {
          const disDay = a.discharged_at.split("T")[0];
          if (!dailyMap[disDay]) dailyMap[disDay] = { admissions: 0, discharges: 0 };
          dailyMap[disDay].discharges++;
        }
      });

      const history = Object.entries(dailyMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 30)
        .map(([date, v]) => `${date}: ${v.admissions} adm, ${v.discharges} dis`);

      const response = await callAI({
        featureKey: "ai_digest",
        hospitalId,
        prompt: `Forecast hospital bed demand for next 7 days.
    
Hospital capacity: ${totalBeds} beds
Current occupancy: ${currentOccupancy} beds (${Math.round((currentOccupancy / totalBeds) * 100)}%)

Daily admissions/discharges last 30 days (recent first):
${history.join("\n") || "No data"}

Return ONLY JSON:
{
  "forecast": [
    {"day": "Mon", "expected_beds_needed": 42, "available": 8}
  ],
  "peak_day": "Thursday",
  "shortage_risk": false,
  "recommended_action": "Consider deferring 3 elective admissions on Thursday"
}`,
        maxTokens: 300,
      });

      if (response.error) return;
      const parsed = JSON.parse(
        response.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      );
      setResult(parsed);
    } catch {
      /* graceful */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" /> 7-Day Bed Forecast
        </CardTitle>
        <Button size="sm" variant="outline" onClick={runForecast} disabled={loading} className="text-xs h-7">
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
          {loading ? "Forecasting..." : "Run Forecast"}
        </Button>
      </CardHeader>
      <CardContent>
        {!result && !loading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Click "Run Forecast" to predict bed occupancy for the next 7 days
          </p>
        )}
        {result && (
          <div className="space-y-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={result.forecast} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <ReferenceLine y={totalBeds} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: `Capacity: ${totalBeds}`, fontSize: 9, fill: "hsl(var(--destructive))" }} />
                <Bar dataKey="expected_beds_needed" name="Beds Needed" radius={[3, 3, 0, 0]}>
                  {result.forecast.map((d, i) => (
                    <Cell key={i} fill={d.expected_beds_needed >= totalBeds ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={result.shortage_risk ? "destructive" : "secondary"} className="text-[10px]">
                {result.shortage_risk ? "⚠️ Shortage Risk" : "✅ Capacity OK"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">Peak: {result.peak_day}</span>
            </div>
            {result.recommended_action && (
              <p className="text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                💡 {result.recommended_action}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BedForecastCard;
