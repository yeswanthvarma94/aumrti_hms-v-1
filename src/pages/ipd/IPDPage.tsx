import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import BedMap from "@/components/ipd/BedMap";
import IPDWorkspace from "@/components/ipd/IPDWorkspace";
import WardStats from "@/components/ipd/WardStats";

export interface BedData {
  id: string;
  bed_number: string;
  status: string;
  ward_id: string;
  ward_name?: string;
  admission?: {
    id: string;
    patient_name: string;
    patient_initials: string;
    admitted_at: string;
    admission_type: string;
    doctor_name: string;
    los_days: number;
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
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [beds, setBeds] = useState<BedData[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ud } = await supabase.from("users").select("hospital_id").eq("id", user.id).single();
    if (!ud) return;
    setHospitalId(ud.hospital_id);

    // Fetch beds with ward names
    const { data: bedData } = await supabase
      .from("beds")
      .select("id, bed_number, status, ward_id, ward:wards(name)")
      .eq("hospital_id", ud.hospital_id)
      .eq("is_active", true)
      .order("bed_number");

    // Fetch active admissions
    const { data: admData } = await supabase
      .from("admissions")
      .select("id, patient_id, bed_id, ward_id, admission_type, admitted_at, expected_discharge_date, admitting_doctor_id, status, patient:patients(full_name), bed:beds(bed_number), ward:wards(name), doctor:users!admissions_admitting_doctor_id_fkey(full_name)")
      .eq("hospital_id", ud.hospital_id)
      .eq("status", "active");

    const admMap = new Map<string, {
      id: string; patient_name: string; patient_initials: string;
      admitted_at: string; admission_type: string; doctor_name: string; los_days: number;
    }>();

    const admRows: AdmissionRow[] = [];

    (admData || []).forEach((a: Record<string, unknown>) => {
      const patient = a.patient as { full_name: string } | null;
      const bed = a.bed as { bed_number: string } | null;
      const ward = a.ward as { name: string } | null;
      const doctor = a.doctor as { full_name: string } | null;
      const name = patient?.full_name || "—";
      const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      const los = Math.max(1, Math.ceil((Date.now() - new Date(a.admitted_at as string).getTime()) / 86400000));

      admMap.set(a.bed_id as string, {
        id: a.id as string,
        patient_name: name,
        patient_initials: initials,
        admitted_at: a.admitted_at as string,
        admission_type: a.admission_type as string,
        doctor_name: doctor?.full_name || "—",
        los_days: los,
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

    const mappedBeds: BedData[] = (bedData || []).map((b: Record<string, unknown>) => {
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

    setBeds(mappedBeds);
    setAdmissions(admRows);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!hospitalId) return;
    const ch = supabase.channel("ipd-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "beds", filter: `hospital_id=eq.${hospitalId}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "admissions", filter: `hospital_id=eq.${hospitalId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospitalId, fetchData]);

  const selectedBed = beds.find((b) => b.id === selectedBedId) || null;

  return (
    <div className="flex flex-row h-full overflow-hidden">
      <BedMap beds={beds} selectedBedId={selectedBedId} onSelectBed={setSelectedBedId} hospitalId={hospitalId} loading={loading} onRefresh={fetchData} />
      <IPDWorkspace bed={selectedBed} />
      <WardStats admissions={admissions} onSelectBed={setSelectedBedId} />
    </div>
  );
};

export default IPDPage;
