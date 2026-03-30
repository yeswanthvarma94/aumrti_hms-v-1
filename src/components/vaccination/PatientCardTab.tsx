import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Printer, MessageSquare } from "lucide-react";

interface Props { hospitalId: string; }

const MILESTONES = [
  { label: "Birth", weeks: [0] },
  { label: "6 wk", weeks: [6] },
  { label: "10 wk", weeks: [10] },
  { label: "14 wk", weeks: [14] },
  { label: "9 mo", weeks: [39] },
  { label: "16-24 mo", weeks: [78] },
  { label: "5-6 yr", weeks: [] },
  { label: "10 yr", weeks: [] },
  { label: "16 yr", weeks: [] },
];

const PatientCardTab: React.FC<Props> = ({ hospitalId }) => {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [dueItems, setDueItems] = useState<any[]>([]);
  const [optionalVaccines, setOptionalVaccines] = useState<any[]>([]);

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 2) { setPatients([]); return; }
    const { data } = await supabase.from("patients").select("id, full_name, uhid, date_of_birth, phone")
      .eq("hospital_id", hospitalId)
      .or(`full_name.ilike.%${q}%,uhid.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10);
    setPatients(data || []);
  }, [hospitalId]);

  useEffect(() => {
    const t = setTimeout(() => searchPatients(search), 300);
    return () => clearTimeout(t);
  }, [search, searchPatients]);

  const selectPatient = async (p: any) => {
    setSelectedPatient(p);
    setPatients([]);
    setSearch("");

    const [vacRes, recRes, dueRes, optRes] = await Promise.all([
      supabase.from("vaccine_master").select("*").eq("nis_schedule", true).order("week_of_life"),
      supabase.from("vaccination_records").select("*, vaccine_master(vaccine_name, vaccine_code, week_of_life)")
        .eq("patient_id", p.id).eq("hospital_id", hospitalId),
      supabase.from("vaccination_due").select("*, vaccine_master(vaccine_name, vaccine_code, week_of_life)")
        .eq("patient_id", p.id).eq("hospital_id", hospitalId).in("status", ["due", "overdue"]),
      supabase.from("vaccine_master").select("*").eq("nis_schedule", false).eq("is_active", true),
    ]);

    setVaccines(vacRes.data || []);
    setRecords(recRes.data || []);
    setDueItems(dueRes.data || []);
    setOptionalVaccines(optRes.data || []);

    // Auto-generate due schedule if no due items exist
    if ((dueRes.data || []).length === 0 && p.date_of_birth) {
      await generateDueSchedule(p.id, p.date_of_birth, vacRes.data || [], recRes.data || []);
      // Re-fetch
      const { data: newDue } = await supabase.from("vaccination_due")
        .select("*, vaccine_master(vaccine_name, vaccine_code, week_of_life)")
        .eq("patient_id", p.id).eq("hospital_id", hospitalId).in("status", ["due", "overdue"]);
      setDueItems(newDue || []);
    }
  };

  const generateDueSchedule = async (patientId: string, dob: string, vacs: any[], given: any[]) => {
    const dobDate = new Date(dob);
    const givenSet = new Set(given.map((g: any) => `${g.vaccine_id}-${g.dose_number}`));
    const dueList: any[] = [];

    for (const v of vacs) {
      if (!v.nis_schedule || v.week_of_life === null) continue;
      const key = `${v.id}-1`;
      if (givenSet.has(key)) continue;
      const dueDate = new Date(dobDate);
      dueDate.setDate(dueDate.getDate() + v.week_of_life * 7);
      dueList.push({
        hospital_id: hospitalId,
        patient_id: patientId,
        vaccine_id: v.id,
        dose_number: 1,
        due_date: dueDate.toISOString().split("T")[0],
        status: dueDate <= new Date() ? "overdue" : "due",
      });
    }
    if (dueList.length > 0) {
      await supabase.from("vaccination_due").insert(dueList);
    }
  };

  const getVaccineStatus = (vaccineId: string) => {
    const rec = records.find((r: any) => r.vaccine_id === vaccineId);
    if (rec) return { status: "given", date: rec.administered_at };
    const due = dueItems.find((d: any) => d.vaccine_id === vaccineId);
    if (due) return { status: due.status, date: due.due_date };
    return { status: "upcoming", date: null };
  };

  const getAge = (dob: string) => {
    const d = new Date(dob);
    const now = new Date();
    const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (months < 1) return `${Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000))} days`;
    if (months < 24) return `${months} months`;
    return `${Math.floor(months / 12)} years`;
  };

  const sendWhatsApp = () => {
    if (!selectedPatient) return;
    const lines = [`Vaccination record for ${selectedPatient.full_name}:`];
    for (const r of records) {
      const vm = (r as any).vaccine_master;
      lines.push(`✅ ${vm?.vaccine_name || "Vaccine"}: ${r.administered_at}`);
    }
    for (const d of dueItems) {
      const vm = (d as any).vaccine_master;
      if (d.status === "overdue") lines.push(`⚠️ OVERDUE: ${vm?.vaccine_name} (due: ${d.due_date})`);
      else lines.push(`📅 Next: ${vm?.vaccine_name} on ${d.due_date}`);
    }
    const msg = encodeURIComponent(lines.join("\n"));
    const phone = selectedPatient.phone?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search patient by name / UHID / phone" value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        {patients.length > 0 && (
          <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
            {patients.map((p) => (
              <button key={p.id} onClick={() => selectPatient(p)}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between">
                <span className="font-medium">{p.full_name}</span>
                <span className="text-muted-foreground font-mono text-xs">{p.uhid}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPatient && (
        <>
          {/* Patient Info */}
          <Card className="p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{selectedPatient.full_name}
                <span className="ml-2 text-xs font-mono text-muted-foreground">{selectedPatient.uhid}</span>
              </p>
              {selectedPatient.date_of_birth && (
                <p className="text-sm text-muted-foreground">
                  DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString("en-IN")} · Age: {getAge(selectedPatient.date_of_birth)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.info("Print feature coming soon")}>
                <Printer className="h-4 w-4 mr-1" /> Print Card
              </Button>
              <Button size="sm" variant="outline" onClick={sendWhatsApp}>
                <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
            </div>
          </Card>

          {/* NIS Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-2">National Immunization Schedule</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {MILESTONES.map((ms) => {
                const msVaccines = vaccines.filter((v: any) =>
                  ms.weeks.length > 0 ? ms.weeks.includes(v.week_of_life) : false
                );
                if (msVaccines.length === 0 && ms.weeks.length > 0) return null;
                return (
                  <Card key={ms.label} className="p-2">
                    <p className="text-[10px] font-bold text-center text-muted-foreground uppercase mb-1">{ms.label}</p>
                    <div className="space-y-1">
                      {msVaccines.map((v: any) => {
                        const s = getVaccineStatus(v.id);
                        return (
                          <Badge key={v.id} variant={s.status === "given" ? "default" : s.status === "overdue" ? "destructive" : "secondary"}
                            className="w-full justify-center text-[10px] py-0.5">
                            {v.vaccine_code}
                            {s.status === "given" && " ✅"}
                            {s.status === "overdue" && " ⚠️"}
                          </Badge>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Optional Vaccines */}
          {optionalVaccines.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Optional / IAP Recommended</h3>
              <div className="flex flex-wrap gap-2">
                {optionalVaccines.map((v: any) => {
                  const s = getVaccineStatus(v.id);
                  return (
                    <Badge key={v.id} variant={s.status === "given" ? "default" : "outline"}
                      className="text-xs">
                      {v.vaccine_name} {s.status === "given" ? "✅" : ""}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedPatient && (
        <div className="text-center py-16 text-muted-foreground">
          <Syringe className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search for a patient to view their vaccination card</p>
        </div>
      )}
    </div>
  );
};

import { Syringe } from "lucide-react";
export default PatientCardTab;
