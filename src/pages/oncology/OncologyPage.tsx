import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DaycareBoardTab from "@/components/oncology/DaycareBoardTab";
import ChemoOrdersTab from "@/components/oncology/ChemoOrdersTab";
import OncologyPatientsTab from "@/components/oncology/OncologyPatientsTab";
import ProtocolsTab from "@/components/oncology/ProtocolsTab";
import OncologyReportsTab from "@/components/oncology/OncologyReportsTab";

const OncologyPage: React.FC = () => {
  const { toast } = useToast();
  const [kpis, setKpis] = useState({ todaySessions: 0, pendingVerification: 0, chairsOccupied: 0, totalChairs: 0, lowAnc: 0 });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    loadKpis();
  }, []);

  const loadKpis = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [ordersRes, chairsRes] = await Promise.all([
      (supabase as any).from("chemo_orders").select("id, status, anc, scheduled_date").eq("scheduled_date", today),
      (supabase as any).from("daycare_chairs").select("id, status"),
    ]);
    const orders = ordersRes.data || [];
    const chairs = chairsRes.data || [];
    setKpis({
      todaySessions: orders.length,
      pendingVerification: orders.filter((o: any) => o.status === "pending_verification").length,
      chairsOccupied: chairs.filter((c: any) => c.status === "occupied").length,
      totalChairs: chairs.length,
      lowAnc: orders.filter((o: any) => o.anc !== null && parseFloat(o.anc) < 1000).length,
    });
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0" style={{ height: 52 }}>
        <h1 className="text-base font-bold text-foreground">🎗️ Oncology & Chemotherapy</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">💊 {kpis.todaySessions} Sessions Today</Badge>
          <Badge variant="outline" className={`text-xs ${kpis.pendingVerification > 0 ? "border-amber-500 text-amber-700 bg-amber-50" : ""}`}>
            ⚠️ {kpis.pendingVerification} Awaiting Verification
          </Badge>
          <Badge variant="outline" className="text-xs">🪑 {kpis.chairsOccupied}/{kpis.totalChairs} Chairs</Badge>
          {kpis.lowAnc > 0 && (
            <Badge variant="destructive" className="text-xs">🔬 {kpis.lowAnc} Low ANC</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowNewOrder(true)}>+ New Chemo Order</Button>
          <Button size="sm" variant="outline" onClick={() => setShowRegister(true)}>+ Register Patient</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daycare" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 w-fit shrink-0">
          <TabsTrigger value="daycare">🪑 Daycare Board</TabsTrigger>
          <TabsTrigger value="orders">📋 Orders</TabsTrigger>
          <TabsTrigger value="patients">👤 Patients</TabsTrigger>
          <TabsTrigger value="protocols">⚗️ Protocols</TabsTrigger>
          <TabsTrigger value="reports">📊 Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="daycare" className="flex-1 overflow-auto px-4 pb-4">
          <DaycareBoardTab showNewOrder={showNewOrder} onCloseNewOrder={() => setShowNewOrder(false)} onRefresh={loadKpis} />
        </TabsContent>
        <TabsContent value="orders" className="flex-1 overflow-auto px-4 pb-4">
          <ChemoOrdersTab onRefresh={loadKpis} />
        </TabsContent>
        <TabsContent value="patients" className="flex-1 overflow-auto px-4 pb-4">
          <OncologyPatientsTab showRegister={false} onCloseRegister={() => {}} />
        </TabsContent>
        <TabsContent value="protocols" className="flex-1 overflow-auto px-4 pb-4">
          <ProtocolsTab />
        </TabsContent>
        <TabsContent value="reports" className="flex-1 overflow-auto px-4 pb-4">
          <OncologyReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OncologyPage;
