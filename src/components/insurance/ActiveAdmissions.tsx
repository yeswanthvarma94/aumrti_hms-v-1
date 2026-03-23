import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface AdmissionRow {
  id: string;
  patient_name: string;
  patient_id: string;
  uhid: string;
  ward_name: string;
  bed_number: string;
  insurance_type: string;
  insurance_id: string | null;
  admitted_at: string;
  doctor_name: string;
  pre_auth_status: string | null;
  pre_auth_approved: number | null;
}

interface AdmissionContext {
  admission_id: string;
  patient_id: string;
  patient_name: string;
  insurance_type: string;
}

interface Props {
  onNavigate?: (nav: string, admissionData?: AdmissionContext) => void;
}

const ActiveAdmissions: React.FC<Props> = ({ onNavigate }) => {
  const [rows, setRows] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: admissions } = await supabase
      .from("admissions")
      .select(`id, admitted_at, insurance_type, insurance_id, patient_id, ward_id, bed_id, admitting_doctor_id`)
      .eq("status", "active")
      .neq("insurance_type", "self_pay");

    if (!admissions?.length) { setRows([]); setLoading(false); return; }

    const patientIds = [...new Set(admissions.map(a => a.patient_id))];
    const wardIds = [...new Set(admissions.map(a => a.ward_id))];
    const bedIds = [...new Set(admissions.map(a => a.bed_id))];
    const doctorIds = [...new Set(admissions.map(a => a.admitting_doctor_id))];
    const admissionIds = admissions.map(a => a.id);

    const [pRes, wRes, bRes, dRes, paRes] = await Promise.all([
      supabase.from("patients").select("id, full_name, uhid").in("id", patientIds),
      supabase.from("wards").select("id, name").in("id", wardIds),
      supabase.from("beds").select("id, bed_number").in("id", bedIds),
      supabase.from("users").select("id, full_name").in("id", doctorIds),
      supabase.from("insurance_pre_auth").select("admission_id, status, approved_amount").in("admission_id", admissionIds),
    ]);

    const pMap = Object.fromEntries((pRes.data || []).map(p => [p.id, p]));
    const wMap = Object.fromEntries((wRes.data || []).map(w => [w.id, w]));
    const bMap = Object.fromEntries((bRes.data || []).map(b => [b.id, b]));
    const dMap = Object.fromEntries((dRes.data || []).map(d => [d.id, d]));
    const paMap = Object.fromEntries((paRes.data || []).map(pa => [pa.admission_id, pa]));

    setRows(admissions.map(a => ({
      id: a.id,
      patient_name: pMap[a.patient_id]?.full_name || "Unknown",
      patient_id: a.patient_id,
      uhid: pMap[a.patient_id]?.uhid || "",
      ward_name: wMap[a.ward_id]?.name || "",
      bed_number: bMap[a.bed_id]?.bed_number || "",
      insurance_type: a.insurance_type,
      insurance_id: a.insurance_id,
      admitted_at: a.admitted_at,
      doctor_name: dMap[a.admitting_doctor_id]?.full_name || "",
      pre_auth_status: paMap[a.id]?.status || null,
      pre_auth_approved: paMap[a.id]?.approved_amount ? Number(paMap[a.id].approved_amount) : null,
    })));
    setLoading(false);
  };

  const preAuthBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" className="text-[10px]">Not Done</Badge>;
    const map: Record<string, string> = {
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      submitted: "bg-blue-50 text-blue-700 border-blue-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    return <Badge variant="outline" className={cn("text-[10px] capitalize", map[status] || "")}>{status}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="bg-background rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Patient</TableHead>
              <TableHead className="text-[11px]">UHID</TableHead>
              <TableHead className="text-[11px]">Ward / Bed</TableHead>
              <TableHead className="text-[11px]">Insurance</TableHead>
              <TableHead className="text-[11px]">Pre-Auth</TableHead>
              <TableHead className="text-[11px]">Days</TableHead>
              <TableHead className="text-[11px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">No active insurance admissions</TableCell></TableRow>
            ) : rows.map(r => {
              const days = differenceInDays(new Date(), new Date(r.admitted_at));
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-[13px] font-medium">{r.patient_name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] font-mono">{r.uhid}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.ward_name} · Bed {r.bed_number}</TableCell>
                  <TableCell className="text-xs capitalize">{r.insurance_type.replace("_", " ")}</TableCell>
                  <TableCell>{preAuthBadge(r.pre_auth_status)}</TableCell>
                  <TableCell className={cn("text-xs font-medium tabular-nums", days > 45 ? "text-destructive" : "")}>{days}</TableCell>
                  <TableCell>
                    {!r.pre_auth_status ? (
                      <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={() => onNavigate?.("preauth", {
                        admission_id: r.id,
                        patient_id: r.patient_id,
                        patient_name: r.patient_name,
                        insurance_type: r.insurance_type,
                      })}>
                        Request Pre-Auth
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-[11px] h-7">View</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ActiveAdmissions;
