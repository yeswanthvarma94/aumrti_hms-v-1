import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortalSession } from "./PortalLogin";

const PortalAppointments: React.FC<{ session: PortalSession }> = ({ session }) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opd_tokens")
        .select("id, token_number, visit_date, status, priority, doctor_id, department_id")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("visit_date", { ascending: false })
        .limit(30);

      const enriched = await Promise.all(
        (data || []).map(async (t) => {
          let doctorName = "";
          let deptName = "";
          if (t.doctor_id) {
            const { data: doc } = await supabase.from("users").select("full_name, department_id").eq("id", t.doctor_id).maybeSingle();
            doctorName = doc?.full_name || "";
            if (doc?.department_id) {
              const { data: dept } = await supabase.from("departments").select("name").eq("id", doc.department_id).maybeSingle();
              deptName = dept?.name || "";
            }
          }
          return { ...t, doctorName, deptName };
        })
      );
      setTokens(enriched);
      setLoading(false);
    })();
  }, [session]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 py-4">
      <h2 className="text-base font-bold mb-3" style={{ color: "#0F172A" }}>My Appointments</h2>

      {loading ? (
        <SkeletonList />
      ) : tokens.length === 0 ? (
        <EmptyCard text="No appointments found" />
      ) : (
        <div className="space-y-2.5">
          {tokens.map((t) => {
            const isPast = t.visit_date < today;
            const statusColor = t.status === "completed" ? "#10B981" : t.status === "cancelled" ? "#94A3B8" : "#0E7B7B";
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl p-3.5"
                style={{ border: "1px solid #E2E8F0", opacity: isPast ? 0.7 : 1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono" style={{ color: "#94A3B8" }}>Token #{t.token_number}</span>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ color: statusColor, background: `${statusColor}15` }}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                  {t.doctorName ? `Dr. ${t.doctorName}` : "Doctor"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                  {t.deptName && `${t.deptName} · `}
                  {new Date(t.visit_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </p>
                {t.priority !== "normal" && (
                  <span className="text-[10px] font-bold mt-1 inline-block" style={{ color: "#F59E0B" }}>⚡ {t.priority}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EmptyCard: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-white rounded-xl p-10 text-center" style={{ border: "1px solid #E2E8F0" }}>
    <p className="text-sm" style={{ color: "#94A3B8" }}>{text}</p>
  </div>
);

const SkeletonList: React.FC = () => (
  <div className="space-y-2.5">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white rounded-xl p-4 animate-pulse" style={{ border: "1px solid #E2E8F0" }}>
        <div className="h-3 w-20 rounded" style={{ background: "#E2E8F0" }} />
        <div className="h-4 w-32 rounded mt-2" style={{ background: "#E2E8F0" }} />
      </div>
    ))}
  </div>
);

export default PortalAppointments;
