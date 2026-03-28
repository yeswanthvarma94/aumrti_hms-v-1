import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePlus, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RecordsIndexTab from "@/components/mrd/RecordsIndexTab";
import ICDCodingTab from "@/components/mrd/ICDCodingTab";
import RecordRequestsTab from "@/components/mrd/RecordRequestsTab";
import DeathCertificatesTab from "@/components/mrd/DeathCertificatesTab";
import RetentionTab from "@/components/mrd/RetentionTab";

const MRDPage: React.FC = () => {
  const [kpis, setKpis] = useState({ totalRecords: 0, pendingCoding: 0, pendingRequests: 0, dueDestruction: 0 });
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showDeathCert, setShowDeathCert] = useState(false);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userData } = await (supabase as any).from("users").select("hospital_id").eq("auth_user_id", user.id).single();
    if (!userData) return;
    const hid = userData.hospital_id;

    const [r1, r2, r3, r4] = await Promise.all([
      (supabase as any).from("medical_records").select("*", { count: "exact", head: true }).eq("hospital_id", hid),
      (supabase as any).from("icd_codings").select("*", { count: "exact", head: true }).eq("hospital_id", hid).eq("status", "pending"),
      (supabase as any).from("record_requests").select("*", { count: "exact", head: true }).eq("hospital_id", hid).eq("status", "pending"),
      (supabase as any).from("retention_schedules").select("*", { count: "exact", head: true }).eq("hospital_id", hid).eq("is_destroyed", false).lte("retain_until", new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]),
    ]);

    setKpis({
      totalRecords: r1.count || 0,
      pendingCoding: r2.count || 0,
      pendingRequests: r3.count || 0,
      dueDestruction: r4.count || 0,
    });
  };

  const kpiCards = [
    { label: "Total Records", value: kpis.totalRecords, color: "text-primary" },
    { label: "Pending ICD Coding", value: kpis.pendingCoding, color: "text-amber-600" },
    { label: "Pending Requests", value: kpis.pendingRequests, color: "text-blue-600" },
    { label: "Due for Destruction", value: kpis.dueDestruction, color: "text-destructive" },
  ];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background" style={{ height: 52 }}>
        <h1 className="text-base font-bold flex items-center gap-2">🗂️ Medical Records</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowNewRequest(true)}>
            <FilePlus className="h-4 w-4 mr-1" /> New Record Request
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDeathCert(true)}>
            <ScrollText className="h-4 w-4 mr-1" /> Death Certificate
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3 px-4 py-3" style={{ height: 72 }}>
        {kpiCards.map((k) => (
          <Card key={k.label} className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-muted-foreground">{k.label}</span>
            <span className={`text-lg font-bold ${k.color}`}>{k.value}</span>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="records" className="flex-1 flex flex-col overflow-hidden px-4">
        <TabsList className="w-fit" style={{ height: 44 }}>
          <TabsTrigger value="records">📋 Records Index</TabsTrigger>
          <TabsTrigger value="icd">🏷️ ICD Coding</TabsTrigger>
          <TabsTrigger value="requests">📨 Requests</TabsTrigger>
          <TabsTrigger value="death">📜 Death Certs</TabsTrigger>
          <TabsTrigger value="retention">📅 Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="flex-1 overflow-hidden mt-2">
          <RecordsIndexTab />
        </TabsContent>
        <TabsContent value="icd" className="flex-1 overflow-hidden mt-2">
          <ICDCodingTab />
        </TabsContent>
        <TabsContent value="requests" className="flex-1 overflow-hidden mt-2">
          <RecordRequestsTab showNewRequest={showNewRequest} onCloseNewRequest={() => setShowNewRequest(false)} />
        </TabsContent>
        <TabsContent value="death" className="flex-1 overflow-hidden mt-2">
          <DeathCertificatesTab showCreate={showDeathCert} onCloseCreate={() => setShowDeathCert(false)} />
        </TabsContent>
        <TabsContent value="retention" className="flex-1 overflow-hidden mt-2">
          <RetentionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MRDPage;
