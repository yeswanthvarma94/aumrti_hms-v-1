import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortalSession } from "./PortalLogin";

const PortalBills: React.FC<{ session: PortalSession }> = ({ session }) => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bills")
        .select("id, bill_number, bill_date, bill_type, total_amount, paid_amount, balance_due, payment_status")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("bill_date", { ascending: false })
        .limit(30);
      setBills(data || []);
      setLoading(false);
    })();
  }, [session]);

  const totalDue = bills.reduce((s, b) => s + (b.balance_due || 0), 0);

  return (
    <div className="px-4 py-4">
      <h2 className="text-base font-bold mb-1" style={{ color: "#0F172A" }}>Bills & Payments</h2>

      {totalDue > 0 && (
        <div
          className="rounded-xl p-4 mb-3 flex items-center justify-between"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: "#DC2626" }}>Total Outstanding</p>
            <p className="text-xl font-bold" style={{ color: "#DC2626" }}>
              ₹{totalDue.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : bills.length === 0 ? (
        <EmptyCard text="No bills found" />
      ) : (
        <div className="space-y-2.5">
          {bills.map((b) => {
            const isPaid = (b.balance_due || 0) <= 0;
            const statusColor = isPaid ? "#10B981" : "#EF4444";
            return (
              <div key={b.id} className="bg-white rounded-xl p-3.5" style={{ border: "1px solid #E2E8F0" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono" style={{ color: "#94A3B8" }}>#{b.bill_number}</span>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ color: statusColor, background: `${statusColor}15` }}
                  >
                    {isPaid ? "Paid" : "Due"}
                  </span>
                </div>
                <p className="text-base font-bold" style={{ color: "#0F172A" }}>
                  ₹{(b.total_amount || 0).toLocaleString("en-IN")}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: "#64748B" }}>
                    {new Date(b.bill_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {b.bill_type && ` · ${b.bill_type.toUpperCase()}`}
                  </span>
                  {!isPaid && (
                    <span className="text-xs font-bold" style={{ color: "#EF4444" }}>
                      Due: ₹{(b.balance_due || 0).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
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

export default PortalBills;
