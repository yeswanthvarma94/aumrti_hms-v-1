import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortalSession } from "./PortalLogin";

const PortalPrescriptions: React.FC<{ session: PortalSession }> = ({ session }) => {
  const [rxList, setRxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select("id, prescription_date, drugs, advice_notes, review_date, doctor_id")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("prescription_date", { ascending: false })
        .limit(30);

      const enriched = await Promise.all(
        (data || []).map(async (rx) => {
          let doctorName = "";
          if (rx.doctor_id) {
            const { data: doc } = await supabase.from("users").select("full_name").eq("id", rx.doctor_id).maybeSingle();
            doctorName = doc?.full_name || "";
          }
          return { ...rx, doctorName };
        })
      );
      setRxList(enriched);
      setLoading(false);
    })();
  }, [session]);

  return (
    <div className="px-4 py-4">
      <h2 className="text-base font-bold mb-3" style={{ color: "#0F172A" }}>Prescriptions</h2>

      {loading ? (
        <SkeletonList />
      ) : rxList.length === 0 ? (
        <EmptyCard text="No prescriptions found" />
      ) : (
        <div className="space-y-2.5">
          {rxList.map((rx) => {
            const drugs: any[] = Array.isArray(rx.drugs) ? rx.drugs : [];
            return (
              <div key={rx.id} className="bg-white rounded-xl p-3.5" style={{ border: "1px solid #E2E8F0" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                    {rx.prescription_date
                      ? new Date(rx.prescription_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                  {rx.doctorName && (
                    <span className="text-[10px]" style={{ color: "#64748B" }}>Dr. {rx.doctorName}</span>
                  )}
                </div>

                {drugs.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {drugs.map((d: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 py-1 px-2 rounded-lg"
                        style={{ background: "#F8FAFC" }}
                      >
                        <span className="text-xs shrink-0">💊</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium" style={{ color: "#0F172A" }}>
                            {d.drug_name || d.name || "Medication"}
                          </p>
                          <p className="text-[10px]" style={{ color: "#64748B" }}>
                            {[d.dose, d.frequency, d.route, d.duration].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rx.advice_notes && (
                  <p className="text-xs mt-2 italic" style={{ color: "#64748B" }}>📝 {rx.advice_notes}</p>
                )}

                {rx.review_date && (
                  <p className="text-xs font-medium mt-2" style={{ color: "#0E7B7B" }}>
                    📅 Review: {new Date(rx.review_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
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

export default PortalPrescriptions;
