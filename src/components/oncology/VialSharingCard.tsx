import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, ArrowRight } from "lucide-react";

interface VialSharingCardProps {
  orders: any[];
}

interface SharingOpp {
  drug: string;
  patients: string[];
  estimatedSaving: number;
  recommendation: string;
}

const VialSharingCard: React.FC<VialSharingCardProps> = ({ orders }) => {
  const [opportunities, setOpportunities] = useState<SharingOpp[]>([]);

  useEffect(() => {
    if (!orders?.length) return;

    const drugGroups: Record<string, { patient: string; dose: number; time: string }[]> = {};

    for (const order of orders) {
      const patName = order.oncology_patients?.patients?.full_name || "Unknown";
      const drugs = order.chemo_order_drugs || [];
      for (const drug of drugs) {
        if (!drugGroups[drug.drug_name]) drugGroups[drug.drug_name] = [];
        drugGroups[drug.drug_name].push({
          patient: patName,
          dose: drug.planned_dose_mg || 0,
          time: order.created_at || "",
        });
      }
    }

    const savings: SharingOpp[] = [];
    for (const [drugName, patients] of Object.entries(drugGroups)) {
      if (patients.length < 2) continue;
      const names = patients.map((p) => p.patient);
      savings.push({
        drug: drugName,
        patients: names,
        estimatedSaving: Math.round(patients.length * 0.2 * 10000),
        recommendation: `Schedule ${names.join(" + ")} consecutively for ${drugName}`,
      });
    }

    setOpportunities(savings);
  }, [orders]);

  if (opportunities.length === 0) return null;

  const totalSaving = opportunities.reduce((s, o) => s + o.estimatedSaving, 0);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" /> Vial Sharing Opportunities
          </span>
          <Badge variant="secondary" className="text-xs">
            Est. savings ₹{totalSaving.toLocaleString("en-IN")} today
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.map((opp, i) => (
          <div key={i} className="bg-background rounded-lg border border-border p-2.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{opp.drug}</span>
                <Badge variant="outline" className="text-[9px]">
                  {opp.patients.length} patients
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {opp.patients.map((p, j) => (
                  <React.Fragment key={j}>
                    <span className="text-[11px] text-muted-foreground">{p}</span>
                    {j < opp.patients.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[10px] text-success mt-0.5">
                💰 Save ~₹{opp.estimatedSaving.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default VialSharingCard;
