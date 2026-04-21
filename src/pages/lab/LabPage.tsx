import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_REALTIME } from "@/hooks/queries/staleTimes";
import { Microscope } from "lucide-react";
import LabQueuePanel from "@/components/lab/LabQueuePanel";
import LabInfoPanel from "@/components/lab/LabInfoPanel";
import LabResultWorkspace from "@/components/lab/LabResultWorkspace";
import NewLabOrderModal from "@/components/lab/NewLabOrderModal";
import LabQCDashboard from "@/components/lab/LabQCDashboard";

interface LabOrder {
  id: string;
  priority: string;
  status: string;
  order_date: string;
  order_time: string;
  clinical_notes: string | null;
  patient_id: string;
  ordered_by: string;
  patients: { full_name: string; uhid: string; gender: string | null; dob: string | null; phone?: string | null; blood_group?: string | null } | null;
  ordered_by_user: { full_name: string } | null;
  lab_order_items: { id: string; status: string; result_flag: string | null; result_value: string | null; test_id: string; lab_test_master: { tat_minutes: number } | null }[];
}

const LabPage: React.FC = () => {
  const { toast } = useToast();
  const { hospitalId } = useHospitalId();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState("all");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [mainTab, setMainTab] = useState<"worklist" | "qc">("worklist");

  const today = new Date().toISOString().split("T")[0];

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["lab-orders", hospitalId, today],
    enabled: !!hospitalId,
    staleTime: STALE_REALTIME,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_orders")
        .select(`
          id, priority, status, order_date, order_time, clinical_notes, patient_id, ordered_by,
          patients (full_name, uhid, gender, dob, phone, blood_group),
          ordered_by_user:users!lab_orders_ordered_by_fkey (full_name),
          lab_order_items (id, status, result_flag, result_value, test_id, lab_test_master:lab_test_master!lab_order_items_test_id_fkey (tat_minutes))
        `)
        .eq("hospital_id", hospitalId as string)
        .eq("order_date", today)
        .neq("status", "cancelled")
        .order("order_time", { ascending: true });

      if (error) {
        console.error("Lab orders fetch error:", error);
        throw error;
      }
      const sorted = (data || []).sort((a: any, b: any) => {
        const p: Record<string, number> = { stat: 0, urgent: 1, routine: 2 };
        return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
      });
      return sorted as unknown as LabOrder[];
    },
  });

  const fetchOrders = useCallback(() => { refetch(); }, [refetch]);

  // Realtime
  useEffect(() => {
    if (!hospitalId) return;
    const channel = supabase
      .channel("lab-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_orders", filter: `hospital_id=eq.${hospitalId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["lab-orders", hospitalId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_order_items", filter: `hospital_id=eq.${hospitalId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["lab-orders", hospitalId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospitalId, queryClient]);

  const filteredOrders = orders.filter((o) => {
    if (filterTab === "all") return true;
    if (filterTab === "pending") return ["ordered", "sample_collected"].includes(o.status);
    if (filterTab === "in_process") return o.status === "in_process";
    if (filterTab === "ready") return o.status === "partial_results";
    if (filterTab === "completed") return o.status === "completed";
    return true;
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const statCount = orders.filter((o) => o.priority === "stat").length;
  const urgentCount = orders.filter((o) => o.priority === "urgent").length;
  const routineCount = orders.filter((o) => o.priority === "routine").length;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Top tab bar */}
      <div className="h-[40px] flex-shrink-0 bg-card border-b border-border px-5 flex items-center gap-4">
        <button
          onClick={() => setMainTab("worklist")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${mainTab === "worklist" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          🔬 Worklist
        </button>
        <button
          onClick={() => setMainTab("qc")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${mainTab === "qc" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          📊 QC Dashboard
        </button>
      </div>

      {mainTab === "qc" && hospitalId ? (
        <LabQCDashboard hospitalId={hospitalId} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <LabQueuePanel
            orders={filteredOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            filterTab={filterTab}
            onFilterChange={setFilterTab}
            statCount={statCount}
            urgentCount={urgentCount}
            routineCount={routineCount}
            onNewOrder={() => setShowNewOrder(true)}
          />

          {selectedOrder ? (
            <LabResultWorkspace order={selectedOrder} onRefresh={fetchOrders} />
          ) : (
            <div className="flex-1 bg-muted/30 flex items-center justify-center overflow-hidden">
              <div className="text-center space-y-3">
                <Microscope size={48} className="mx-auto text-muted-foreground/40" />
                <p className="text-base text-muted-foreground">Select a test order from the queue</p>
                <p className="text-sm text-muted-foreground/60">or create a new lab order</p>
              </div>
            </div>
          )}

          <LabInfoPanel selectedOrder={selectedOrder} onSelectOrder={setSelectedOrderId} />
        </div>
      )}

      {showNewOrder && hospitalId && (
        <NewLabOrderModal
          hospitalId={hospitalId}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => {
            fetchOrders();
            setShowNewOrder(false);
          }}
        />
      )}
    </div>
  );
};

export default LabPage;
