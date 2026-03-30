import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, User } from "lucide-react";
import ToothChartTab from "@/components/dental/ToothChartTab";
import PeriodontalTab from "@/components/dental/PeriodontalTab";
import TreatmentPlanTab from "@/components/dental/TreatmentPlanTab";
import LabOrdersTab from "@/components/dental/LabOrdersTab";
import type { ChartData } from "@/components/dental/FDIToothChart";

const HOSPITAL_ID = "8f3d08b3-8835-42a7-920e-fdf5a78260bc";

interface PatientRow {
  id: string;
  full_name: string;
  uhid: string;
  gender: string;
  age_years: number | null;
}

const DentalPage: React.FC = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [activeTab, setActiveTab] = useState("chart");

  // Chart state
  const [chartData, setChartData] = useState<ChartData>({});
  const [oralHygiene, setOralHygiene] = useState("");
  const [calculus, setCalculus] = useState("");
  const [softTissueNotes, setSoftTissueNotes] = useState("");
  const [chartId, setChartId] = useState<string | null>(null);

  useEffect(() => {
    searchPatients("");
  }, []);

  const searchPatients = async (q: string) => {
    let query = supabase
      .from("patients")
      .select("id, full_name, uhid, gender, age_years")
      .eq("hospital_id", HOSPITAL_ID)
      .order("created_at", { ascending: false })
      .limit(50);

    if (q.trim()) {
      query = query.or(`full_name.ilike.%${q}%,uhid.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) { console.error(error); return; }
    setPatients(data || []);
  };

  const selectPatient = async (p: PatientRow) => {
    setSelectedPatient(p);
    setActiveTab("chart");
    // Load latest chart
    const { data } = await supabase
      .from("dental_charts")
      .select("*")
      .eq("patient_id", p.id)
      .eq("hospital_id", HOSPITAL_ID)
      .order("chart_date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const c = data[0];
      setChartId(c.id);
      setChartData((c.chart_data as any) || {});
      setOralHygiene(c.oral_hygiene || "");
      setCalculus(c.calculus || "");
      setSoftTissueNotes(c.soft_tissue_notes || "");
    } else {
      setChartId(null);
      setChartData({});
      setOralHygiene("");
      setCalculus("");
      setSoftTissueNotes("");
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0" style={{ height: 52 }}>
        <h1 className="text-base font-bold">🦷 Dental</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> New Patient Chart</Button>
          <Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Lab Order</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Patient List */}
        <div className="w-[280px] border-r bg-card flex flex-col shrink-0">
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by name / UHID"
                value={search}
                onChange={(e) => { setSearch(e.target.value); searchPatients(e.target.value); }}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    selectedPatient?.id === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.uhid} · {p.gender} · {p.age_years ? `${p.age_years}y` : "—"}
                    </p>
                  </div>
                </button>
              ))}
              {patients.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No patients found</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedPatient ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <span className="text-4xl">🦷</span>
                <p className="text-sm">Select a patient to start dental charting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div className="px-4 py-2 border-b bg-muted/20 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedPatient.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPatient.uhid} · {selectedPatient.gender} · {selectedPatient.age_years ? `${selectedPatient.age_years} yrs` : "—"}
                  </p>
                </div>
                {chartId && <Badge variant="outline" className="text-[10px] ml-auto">Existing Chart</Badge>}
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-4 mt-2 w-fit shrink-0">
                  <TabsTrigger value="chart">🦷 Tooth Chart</TabsTrigger>
                  <TabsTrigger value="perio">📊 Perio</TabsTrigger>
                  <TabsTrigger value="treatment">📋 Treatment Plan</TabsTrigger>
                  <TabsTrigger value="lab">🔬 Lab Orders</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden px-4 py-2">
                  <TabsContent value="chart" className="mt-0 h-full">
                    <ToothChartTab
                      patientId={selectedPatient.id}
                      hospitalId={HOSPITAL_ID}
                      chartData={chartData}
                      setChartData={setChartData}
                      oralHygiene={oralHygiene}
                      setOralHygiene={setOralHygiene}
                      calculus={calculus}
                      setCalculus={setCalculus}
                      softTissueNotes={softTissueNotes}
                      setSoftTissueNotes={setSoftTissueNotes}
                      chartId={chartId}
                    />
                  </TabsContent>
                  <TabsContent value="perio" className="mt-0 h-full">
                    <PeriodontalTab patientId={selectedPatient.id} hospitalId={HOSPITAL_ID} />
                  </TabsContent>
                  <TabsContent value="treatment" className="mt-0 h-full">
                    <TreatmentPlanTab patientId={selectedPatient.id} hospitalId={HOSPITAL_ID} />
                  </TabsContent>
                  <TabsContent value="lab" className="mt-0 h-full">
                    <LabOrdersTab patientId={selectedPatient.id} hospitalId={HOSPITAL_ID} />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DentalPage;
