import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowupRow {
  id: string;
  condition_label: string;
  next_followup: string;
  followup_tests: string[] | null;
  patient_name: string;
  patient_phone: string | null;
  patient_uhid: string;
}

interface Props {
  hospitalId: string | null;
}

const ChronicFollowupAlert: React.FC<Props> = ({ hospitalId }) => {
  const [rows, setRows] = useState<FollowupRow[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    const fetch = async () => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data } = await (supabase as any)
        .from("chronic_disease_programs")
        .select("id, condition_label, next_followup, followup_tests, patient:patients(full_name, phone, uhid)")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .lte("next_followup", sevenDaysFromNow.toISOString().split("T")[0])
        .order("next_followup", { ascending: true })
        .limit(10);

      if (data) {
        setRows(
          data.map((d: any) => ({
            id: d.id,
            condition_label: d.condition_label,
            next_followup: d.next_followup,
            followup_tests: d.followup_tests,
            patient_name: d.patient?.full_name || "Unknown",
            patient_phone: d.patient?.phone || null,
            patient_uhid: d.patient?.uhid || "",
          }))
        );
      }
    };
    fetch();
  }, [hospitalId]);

  if (rows.length === 0) return null;

  const sendReminder = (row: FollowupRow) => {
    if (!row.patient_phone) return;
    const phone = row.patient_phone.replace(/\D/g, "");
    const tests = row.followup_tests?.join(", ") || "routine tests";
    const date = new Date(row.next_followup).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const msg = `Dear ${row.patient_name}, your ${row.condition_label} follow-up is due on ${date}. Please book an appointment. Tests required: ${tests}`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="rounded-lg border-l-[3px] border-l-[hsl(38,92%,50%)] bg-[hsl(48,96%,89%,0.3)] p-3 mb-3 flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={16} className="text-[hsl(38,92%,50%)]" />
        <span className="text-[13px] font-bold text-[hsl(28,80%,44%)]">
          Chronic Disease Follow-ups Due
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          {rows.length} patient{rows.length !== 1 ? "s" : ""} need follow-up in next 7 days
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground text-[10px] uppercase">
              <th className="text-left py-1 pr-3">Patient</th>
              <th className="text-left py-1 pr-3">Condition</th>
              <th className="text-left py-1 pr-3">Due Date</th>
              <th className="text-right py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overdue = new Date(r.next_followup) < new Date();
              return (
                <tr key={r.id} className="border-t border-border/30">
                  <td className="py-1.5 pr-3">
                    <span className="font-medium text-foreground">{r.patient_name}</span>
                    <span className="text-muted-foreground ml-1">({r.patient_uhid})</span>
                  </td>
                  <td className="py-1.5 pr-3 text-foreground">{r.condition_label}</td>
                  <td className={`py-1.5 pr-3 font-medium ${overdue ? "text-destructive" : "text-[hsl(38,92%,50%)]"}`}>
                    {new Date(r.next_followup).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    {overdue && " (Overdue)"}
                  </td>
                  <td className="py-1.5 text-right">
                    {r.patient_phone && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => sendReminder(r)}>
                        <Send size={10} /> Remind
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChronicFollowupAlert;
