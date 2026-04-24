import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_MASTER, STALE_REALTIME } from "@/hooks/queries/staleTimes";
import { ScanLine } from "lucide-react";
import RadiologyWorklist from "@/components/radiology/RadiologyWorklist";
import NewRadiologyOrderModal from "@/components/radiology/NewRadiologyOrderModal";
import RadiologyReportingWorkspace from "@/components/radiology/RadiologyReportingWorkspace";

export interface RadiologyOrder {
  id: string;
  priority: string;
  status: string;
  order_date: string;
  order_time: string;
  study_name: string;
  body_part: string | null;
  clinical_history: string | null;
  indication: string | null;
  modality_type: string;
  modality_id: string;
  accession_number: string | null;
  is_pcpndt: boolean;
  patient_id: string;
  ordered_by: string;
  dicom_pacs_url: string | null;
  patients: { full_name: string; uhid: string; gender: string | null; dob: string | null; phone?: string | null; blood_group?: string | null } | null;
  ordered_by_user: { full_name: string } | null;
  radiology_modalities: { name: string; modality_type: string } | null;
  radiology_reports: { id: string; is_signed: boolean }[] | null;
}

export interface Modality {
  id: string;
  name: string;
  modality_type: string;
  is_active: boolean;
}

const RadiologyPage: React.FC = () => {
  const { toast } = useToast();
  const { hospitalId } = useHospitalId();
  const queryClient = useQueryClient();
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filterModality, setFilterModality] = useState("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const { data: modalities = [] } = useQuery({
    queryKey: ["radiology-modalities", hospitalId],
    enabled: !!hospitalId,
    staleTime: STALE_MASTER,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_modalities")
        .select("id, name, modality_type, is_active")
        .eq("hospital_id", hospitalId as string)
        .eq("is_active", true)
        .order("name");
      if (error) { console.error("Radiology modalities fetch error:", error.message); throw error; }
      return (data || []) as Modality[];
    },
  });

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["radiology-orders", hospitalId, selectedDate, filterModality],
    enabled: !!hospitalId,
    staleTime: STALE_REALTIME,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("radiology_orders")
        .select(`
          id, priority, status, order_date, order_time, study_name, body_part,
          clinical_history, indication, modality_type, modality_id,
          accession_number, is_pcpndt, patient_id, ordered_by, dicom_pacs_url,
          patients (full_name, uhid, gender, dob, phone, blood_group),
          ordered_by_user:users!radiology_orders_ordered_by_fkey (full_name),
          radiology_modalities (name, modality_type),
          radiology_reports (id, is_signed)
        `)
        .eq("hospital_id", hospitalId as string)
        .eq("order_date", selectedDate)
        .neq("status", "cancelled")
        .order("order_time", { ascending: true });

      if (filterModality !== "all") {
        query = query.eq("modality_type", filterModality);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Radiology orders fetch error:", error);
        throw error;
      }
      const sorted = (data || []).sort((a: any, b: any) => {
        const p: Record<string, number> = { stat: 0, urgent: 1, routine: 2 };
        return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
      });
      return sorted as unknown as RadiologyOrder[];
    },
  });

  const fetchOrders = useCallback(() => { refetch(); }, [refetch]);
  const invalidateRealtime = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    realtimeDebounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["radiology-orders", hospitalId] });
    }, 800);
  }, [hospitalId, queryClient]);

  // Realtime
  useEffect(() => {
    if (!hospitalId) return;
    const channel = supabase
      .channel("radiology-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "radiology_orders", filter: `hospital_id=eq.${hospitalId}` }, () => {
        invalidateRealtime();
      })
      .subscribe();
    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [hospitalId, invalidateRealtime]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const statCounts = {
    pending: orders.filter(o => ["ordered", "scheduled", "patient_arrived"].includes(o.status)).length,
    imaging: orders.filter(o => o.status === "in_progress").length,
    reporting: orders.filter(o => o.status === "images_acquired").length,
    done: orders.filter(o => ["reported", "validated"].includes(o.status)).length,
  };

  return (
    <div className="flex h-full overflow-hidden">
      <RadiologyWorklist
        orders={orders}
        modalities={modalities}
        selectedOrderId={selectedOrderId}
        onSelectOrder={setSelectedOrderId}
        filterModality={filterModality}
        onFilterChange={setFilterModality}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        statCounts={statCounts}
        onNewOrder={() => setShowNewOrder(true)}
      />

      {selectedOrder && hospitalId ? (
        <RadiologyReportingWorkspace
          order={selectedOrder}
          hospitalId={hospitalId}
          onStatusChange={fetchOrders}
        />
      ) : (
        <div className="flex-1 bg-muted/30 flex items-center justify-center overflow-hidden">
          <div className="text-center space-y-3">
            <ScanLine size={48} className="mx-auto text-muted-foreground/40" />
            <p className="text-base text-muted-foreground">Select a study from the worklist</p>
            <p className="text-sm text-muted-foreground/60">or create a new radiology order</p>
          </div>
        </div>
      )}

      {showNewOrder && hospitalId && (
        <NewRadiologyOrderModal
          hospitalId={hospitalId}
          modalities={modalities}
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

export default RadiologyPage;
