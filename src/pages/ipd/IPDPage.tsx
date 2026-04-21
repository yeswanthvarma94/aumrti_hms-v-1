import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_REALTIME } from "@/hooks/queries/staleTimes";
import BedMap from "@/components/ipd/BedMap";
import IPDWorkspace from "@/components/ipd/IPDWorkspace";
import WardStats from "@/components/ipd/WardStats";
import AdmitPatientModal from "@/components/ipd/AdmitPatientModal";
import BedForecastCard from "@/components/ipd/BedForecastCard";

export interface BedData {
  id: string;
  bed_number: string;
  status: string;
  ward_id: string;
  ward_name?: string;
  admission?: {
    id: string;
    patient_id: string;
    patient_name: string;
    patient_initials: string;
    admitted_at: string;
    admission_type: string;
    admission_number: string;
    admitting_diagnosis: string;
    doctor_name: string;
    los_days: number;
    expected_discharge_date: string | null;
  } | null;
}

export interface AdmissionRow {
  id: string;
  patient_name: string;
  bed_number: string;
  ward_name: string;
  doctor_name: string;
  admission_type: string;
  admitted_at: string;
  expected_discharge_date: string | null;
  los_days: number;
  bed_id: string;
}

const IPDPage: React.FC = () => {
  const { hospitalId } = useHospitalId();
  const queryClient = useQueryClient();
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [admitModal, setAdmitModal] = useState<{ open: boolean; bedId?: string; wardId?: string; bedNumber?: string }>({ open: false });

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["ipd-beds-admissions", hospitalId],
    enabled: !!hospitalId,
    staleTime: STALE_REALTIME,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const [bedRes, admRes] = await Promise.all([
        supabase
          .from("beds")
          .select("id, bed_number, status, ward_id, ward:wards(name)")
          .eq("hospital_id", hospitalId as string)
          .eq("is_active", true)
          .order("bed_number"),
        supabase
          .from("admissions")
          .select("id, patient_id, bed_id, ward_id, admission_type, admission_number, admitting_diagnosis, admitted_at, expected_discharge_date, admitting_doctor_id, status, patient:patients(full_name), bed:beds(bed_number), ward:wards(name), doctor:users!admissions_admitting_doctor_id_fkey(full_name)")
          .eq("hospital_id", hospitalId as string)
          .eq("status", "active"),
      ]);

      if (bedRes.error) console.error("IPD beds fetch error:", bedRes.error.message);
      if (admRes.error) console.error("IPD admissions fetch error:", admRes.error.message);

      const admMap = new Map<string, NonNullable<BedData["admission"]>>();
      const admRows: AdmissionRow[] = [];

      (admRes.data || []).forEach((a: Record<string, unknown>) => {
        const patient = a.patient as { full_name: string } | null;
        const bed = a.bed as { bed_number: string } | null;
        const ward = a.ward as { name: string } | null;
        const doctor = a.doctor as { full_name: string } | null;
        const name = patient?.full_name || "—";
        const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
        const los = Math.max(1, Math.ceil((Date.now() - new Date(a.admitted_at as string).getTime()) / 86400000));

        admMap.set(a.bed_id as string, {
          id: a.id as string,
          patient_id: a.patient_id as string,
          patient_name: name,
          patient_initials: initials,
          admitted_at: a.admitted_at as string,
          admission_type: a.admission_type as string,
          admission_number: a.admission_number as string || "",
          admitting_diagnosis: a.admitting_diagnosis as string || "",
          doctor_name: doctor?.full_name || "—",
          los_days: los,
          expected_discharge_date: a.expected_discharge_date as string | null,
        });

        admRows.push({
          id: a.id as string,
          patient_name: name,
          bed_number: bed?.bed_number || "—",
          ward_name: ward?.name || "—",
          doctor_name: doctor?.full_name || "—",
          admission_type: a.admission_type as string,
          admitted_at: a.admitted_at as string,
          expected_discharge_date: a.expected_discharge_date as string | null,
          los_days: los,
          bed_id: a.bed_id as string,
        });
      });

      const mappedBeds: BedData[] = (bedRes.data || []).map((b: Record<string, unknown>) => {
        const ward = b.ward as { name: string } | null;
        return {
          id: b.id as string,
          bed_number: b.bed_number as string,
          status: b.status as string,
          ward_id: b.ward_id as string,
          ward_name: ward?.name || "—",
          admission: admMap.get(b.id as string) || null,
        };
      });

      return { beds: mappedBeds, admissions: admRows };
    },
  });

  const beds = data?.beds || [];
  const admissions = data?.admissions || [];
  const fetchData = useCallback(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!hospitalId) return;
    const ch = supabase.channel(`ipd-realtime-${hospitalId}-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "beds", filter: `hospital_id=eq.${hospitalId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["ipd-beds-admissions", hospitalId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admissions", filter: `hospital_id=eq.${hospitalId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["ipd-beds-admissions", hospitalId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospitalId, queryClient]);

  const selectedBed = beds.find((b) => b.id === selectedBedId) || null;

  const handleBedSelect = (bedId: string) => {
    const bed = beds.find((b) => b.id === bedId);
    if (bed?.status === "available") {
      setAdmitModal({ open: true, bedId: bed.id, wardId: bed.ward_id, bedNumber: `${bed.ward_name} - ${bed.bed_number}` });
    } else {
      setSelectedBedId(bedId);
    }
  };

  const handleNewAdmission = () => {
    setAdmitModal({ open: true });
  };

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;

  return (
    <div className="flex flex-row h-full overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        {hospitalId && totalBeds > 0 && (
          <div className="flex-shrink-0 p-3 border-b border-border">
            <BedForecastCard hospitalId={hospitalId} totalBeds={totalBeds} currentOccupancy={occupiedBeds} />
          </div>
        )}
        <div className="flex flex-row flex-1 overflow-hidden">
          <BedMap beds={beds} selectedBedId={selectedBedId} onSelectBed={handleBedSelect}
            hospitalId={hospitalId} loading={loading} onRefresh={fetchData} onNewAdmission={handleNewAdmission} />
          <IPDWorkspace bed={selectedBed} hospitalId={hospitalId} onRefresh={fetchData} />
        </div>
      </div>
      <WardStats admissions={admissions} onSelectBed={setSelectedBedId} />

      <AdmitPatientModal
        open={admitModal.open}
        onClose={() => setAdmitModal({ open: false })}
        hospitalId={hospitalId}
        preselectedBedId={admitModal.bedId || null}
        preselectedWardId={admitModal.wardId || null}
        preselectedBedNumber={admitModal.bedNumber || null}
        onAdmitted={fetchData}
      />
    </div>
  );
};

export default IPDPage;
