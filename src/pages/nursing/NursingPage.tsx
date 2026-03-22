import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NursingTaskList from "@/components/nursing/NursingTaskList";
import NursingTaskExecution from "@/components/nursing/NursingTaskExecution";

export interface NursingTask {
  id: string;
  type: "medication" | "vitals" | "handover";
  patientName: string;
  patientId: string;
  admissionId: string;
  bedLabel: string;
  wardName: string;
  wardId: string;
  scheduledTime: string; // HH:MM
  scheduledDate: string;
  status: "overdue" | "due_now" | "upcoming" | "done";
  // medication-specific
  medicationId?: string;
  drugName?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  instructions?: string;
  isNdps?: boolean;
  // vitals-specific
  diagnosis?: string;
  doctorName?: string;
  hospitalId?: string;
}

function getCurrentShift(): { label: string; type: string } {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return { label: "Morning Shift", type: "morning" };
  if (h >= 14 && h < 22) return { label: "Evening Shift", type: "evening" };
  return { label: "Night Shift", type: "night" };
}

function getNextShift(current: string): string {
  if (current === "morning") return "evening";
  if (current === "evening") return "night";
  return "morning";
}

function taskStatus(scheduledTime: string): "overdue" | "due_now" | "upcoming" {
  const now = new Date();
  const [h, m] = scheduledTime.split(":").map(Number);
  const sched = new Date();
  sched.setHours(h, m, 0, 0);
  const diffMin = (sched.getTime() - now.getTime()) / 60000;
  if (diffMin < -30) return "overdue";
  if (diffMin <= 60) return "due_now";
  return "upcoming";
}

// Generate standard medication times from frequency
function getScheduledTimes(frequency: string): string[] {
  const map: Record<string, string[]> = {
    OD: ["08:00"],
    BD: ["08:00", "20:00"],
    TDS: ["08:00", "14:00", "20:00"],
    QID: ["06:00", "12:00", "18:00", "22:00"],
    HS: ["22:00"],
    STAT: ["08:00"],
    SOS: [],
    AC: ["07:30", "13:30", "19:30"],
    PC: ["08:30", "14:30", "20:30"],
  };
  return map[frequency?.toUpperCase()] || ["08:00"];
}

const NursingPage: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<NursingTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<NursingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all");
  const shift = getCurrentShift();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    // Get active admissions with patient + bed + ward info
    let admQuery = supabase
      .from("admissions")
      .select(`
        id, patient_id, bed_id, ward_id, admitting_diagnosis, hospital_id,
        patients!admissions_patient_id_fkey(full_name),
        beds!admissions_bed_id_fkey(bed_number),
        wards!admissions_ward_id_fkey(id, name),
        users!admissions_admitting_doctor_id_fkey(full_name)
      `)
      .eq("status", "active");

    if (selectedWard !== "all") {
      admQuery = admQuery.eq("ward_id", selectedWard);
    }

    const { data: admissions, error: admErr } = await admQuery;
    if (admErr) {
      toast({ title: "Error loading admissions", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!admissions || admissions.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const admIds = admissions.map((a: any) => a.id);

    // Fetch active medications + existing MAR records + recent vitals in parallel
    const [medsRes, marRes, vitalsRes] = await Promise.all([
      supabase.from("ipd_medications").select("*").in("admission_id", admIds).eq("is_active", true),
      supabase.from("nursing_mar").select("medication_id, scheduled_time, outcome").in("admission_id", admIds).eq("scheduled_date", today),
      supabase.from("ipd_vitals").select("admission_id, recorded_at").in("admission_id", admIds).order("recorded_at", { ascending: false }),
    ]);

    const marDone = new Set(
      (marRes.data || [])
        .filter((m: any) => m.outcome !== "pending")
        .map((m: any) => `${m.medication_id}_${m.scheduled_time}`)
    );

    const lastVitals: Record<string, string> = {};
    (vitalsRes.data || []).forEach((v: any) => {
      if (!lastVitals[v.admission_id]) lastVitals[v.admission_id] = v.recorded_at;
    });

    const generatedTasks: NursingTask[] = [];

    for (const adm of admissions as any[]) {
      const patientName = adm.patients?.full_name || "Unknown";
      const bedNumber = adm.beds?.bed_number || "?";
      const wardName = adm.wards?.name || "?";
      const wardId = adm.wards?.id || adm.ward_id;
      const doctorName = adm.users?.full_name || "";

      // Medication tasks
      const admMeds = (medsRes.data || []).filter((m: any) => m.admission_id === adm.id);
      for (const med of admMeds) {
        const times = getScheduledTimes(med.frequency || "OD");
        for (const t of times) {
          const key = `${med.id}_${t}`;
          const done = marDone.has(key);
          generatedTasks.push({
            id: `med_${med.id}_${t}`,
            type: "medication",
            patientName,
            patientId: adm.patient_id,
            admissionId: adm.id,
            bedLabel: `${wardName}-${bedNumber}`,
            wardName,
            wardId,
            scheduledTime: t,
            scheduledDate: today,
            status: done ? "done" : taskStatus(t),
            medicationId: med.id,
            drugName: med.drug_name,
            dose: med.dose,
            route: med.route,
            frequency: med.frequency,
            isNdps: false,
            hospitalId: adm.hospital_id,
          });
        }
      }

      // Vitals task — every 4 hours (06, 10, 14, 18, 22)
      const vitalTimes = ["06:00", "10:00", "14:00", "18:00", "22:00"];
      const lastRecorded = lastVitals[adm.id];
      const hoursSinceVitals = lastRecorded
        ? (Date.now() - new Date(lastRecorded).getTime()) / 3600000
        : 999;

      for (const t of vitalTimes) {
        const [h] = t.split(":").map(Number);
        const now = new Date();
        const schedTime = new Date();
        schedTime.setHours(h, 0, 0, 0);
        // Only show vitals tasks for current shift range roughly
        const diffH = (schedTime.getTime() - now.getTime()) / 3600000;
        if (diffH < -4 || diffH > 8) continue;

        const done = hoursSinceVitals < 2 && taskStatus(t) !== "upcoming";
        generatedTasks.push({
          id: `vitals_${adm.id}_${t}`,
          type: "vitals",
          patientName,
          patientId: adm.patient_id,
          admissionId: adm.id,
          bedLabel: `${wardName}-${bedNumber}`,
          wardName,
          wardId,
          scheduledTime: t,
          scheduledDate: today,
          status: done ? "done" : taskStatus(t),
          diagnosis: adm.admitting_diagnosis,
          doctorName,
          hospitalId: adm.hospital_id,
        });
      }
    }

    // Handover task — 30 min before shift end
    const shiftEndHours: Record<string, number> = { morning: 14, evening: 22, night: 6 };
    const endH = shiftEndHours[shift.type];
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(endH, 0, 0, 0);
    if (shift.type === "night" && now.getHours() >= 22) {
      endTime.setDate(endTime.getDate() + 1);
    }
    const minsToEnd = (endTime.getTime() - now.getTime()) / 60000;

    if (minsToEnd <= 60 && minsToEnd > -60) {
      const handoverTime = `${String(endH).padStart(2, "0")}:00`;
      generatedTasks.push({
        id: "handover_" + shift.type,
        type: "handover",
        patientName: "All Patients",
        patientId: "",
        admissionId: "",
        bedLabel: "",
        wardName: selectedWard === "all" ? "All Wards" : wards.find((w) => w.id === selectedWard)?.name || "",
        wardId: selectedWard,
        scheduledTime: handoverTime,
        scheduledDate: today,
        status: minsToEnd <= 0 ? "overdue" : "due_now",
        hospitalId: admissions[0]?.hospital_id,
      });
    }

    // Sort: overdue first, then due_now, then upcoming, then done
    const order = { overdue: 0, due_now: 1, upcoming: 2, done: 3 };
    generatedTasks.sort((a, b) => order[a.status] - order[b.status] || a.scheduledTime.localeCompare(b.scheduledTime));

    setTasks(generatedTasks);
    setLoading(false);
  }, [selectedWard, shift.type, toast, wards]);

  // Fetch wards
  useEffect(() => {
    supabase
      .from("wards")
      .select("id, name")
      .eq("is_active", true)
      .then(({ data }) => setWards(data || []));
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskComplete = () => {
    fetchTasks();
    // Auto-advance to next pending task
    const nextPending = tasks.find((t) => t.id !== selectedTask?.id && t.status !== "done");
    setSelectedTask(nextPending || null);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "overdue") return t.status === "overdue";
    if (filter === "due_now") return t.status === "due_now";
    if (filter === "upcoming") return t.status === "upcoming";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const stats = {
    overdue: tasks.filter((t) => t.status === "overdue").length,
    due_now: tasks.filter((t) => t.status === "due_now").length,
    upcoming: tasks.filter((t) => t.status === "upcoming").length,
  };

  return (
    <div className="h-full flex overflow-hidden bg-background">
      <NursingTaskList
        tasks={filteredTasks}
        loading={loading}
        selectedTaskId={selectedTask?.id || null}
        onSelectTask={setSelectedTask}
        shift={shift}
        wards={wards}
        selectedWard={selectedWard}
        onWardChange={setSelectedWard}
        filter={filter}
        onFilterChange={setFilter}
        stats={stats}
      />
      <NursingTaskExecution
        task={selectedTask}
        shift={shift}
        wards={wards}
        onComplete={handleTaskComplete}
      />
    </div>
  );
};

export default NursingPage;
