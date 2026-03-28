import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatBloodGroup, componentLabel } from "@/lib/bloodCompatibility";

const COMPONENTS = ['rbc','ffp','platelets','whole_blood','cryoprecipitate'];
const GROUPS = ['A','B','AB','O'];
const RH = ['positive','negative'];

const BBReportsTab: React.FC = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [crossMatches, setCrossMatches] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("blood_units").select("*").then(({ data }) => { if (data) setUnits(data); });
    supabase.from("blood_issues").select("*, blood_units(component)").then(({ data }) => { if (data) setIssues(data); });
    supabase.from("cross_match_records").select("*").then(({ data }) => { if (data) setCrossMatches(data); });
  }, []);

  const available = units.filter(u => u.status === 'available');
  const expired = units.filter(u => u.status === 'expired' || u.status === 'discarded');
  const cmRatio = issues.length > 0 ? (crossMatches.length / issues.length).toFixed(1) : "—";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Inventory Matrix */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Current Inventory Snapshot</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Component</TableHead>
                {GROUPS.flatMap(g => RH.map(r => (
                  <TableHead key={g+r} className="text-xs text-center">{formatBloodGroup(g, r)}</TableHead>
                )))}
                <TableHead className="text-xs text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPONENTS.map(comp => {
                const compUnits = available.filter(u => u.component === comp);
                let total = 0;
                return (
                  <TableRow key={comp}>
                    <TableCell className="text-xs font-medium">{componentLabel(comp)}</TableCell>
                    {GROUPS.flatMap(g => RH.map(r => {
                      const count = compUnits.filter(u => u.blood_group === g && u.rh_factor === r).length;
                      total += count;
                      return (
                        <TableCell key={g+r} className={`text-xs text-center ${count === 0 ? 'text-red-500' : count < 3 ? 'text-amber-600' : 'text-green-600'} font-semibold`}>
                          {count}
                        </TableCell>
                      );
                    }))}
                    <TableCell className="text-xs text-center font-bold">{total}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Usage This Month</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{issues.length}</p>
            <p className="text-xs text-muted-foreground">units issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">C:T Ratio</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cmRatio}</p>
            <p className="text-xs text-muted-foreground">Cross-match : Transfusion (target &lt;2.5)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Expiry Waste</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expired.length}</p>
            <p className="text-xs text-muted-foreground">units expired/discarded</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BBReportsTab;
