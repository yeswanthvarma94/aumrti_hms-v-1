import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortalSession } from "./PortalLogin";

const PortalReports: React.FC<{ session: PortalSession }> = ({ session }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: labOrders } = await supabase
        .from("lab_orders")
        .select("id, order_date, status, priority, clinical_notes")
        .eq("patient_id", session.patientId)
        .eq("hospital_id", session.hospitalId)
        .order("order_date", { ascending: false })
        .limit(30);
      setOrders(labOrders || []);
      setLoading(false);
    })();
  }, [session]);

  const loadItems = async (orderId: string) => {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
  };

  const [items, setItems] = useState<Record<string, any[]>>({});
  useEffect(() => {
    if (!expanded || items[expanded]) return;
    (async () => {
      const { data } = await supabase
        .from("lab_order_items")
        .select("id, status, result_value, result_unit, result_flag, reference_range")
        .eq("lab_order_id", expanded)
        .eq("hospital_id", session.hospitalId);

      // Get test names
      const enriched = await Promise.all(
        (data || []).map(async (item) => {
          const { data: test } = await supabase.from("lab_test_master").select("test_name").eq("id", (item as any).test_id || "").maybeSingle();
          return { ...item, testName: test?.test_name || "Test" };
        })
      );
      setItems((prev) => ({ ...prev, [expanded]: enriched }));
    })();
  }, [expanded]);

  return (
    <div className="px-4 py-4">
      <h2 className="text-base font-bold mb-3" style={{ color: "#0F172A" }}>Lab Reports</h2>

      {loading ? (
        <SkeletonList />
      ) : orders.length === 0 ? (
        <EmptyCard text="No lab reports found" />
      ) : (
        <div className="space-y-2.5">
          {orders.map((o) => {
            const statusColor = o.status === "completed" ? "#10B981" : o.status === "validated" ? "#10B981" : "#F59E0B";
            const isExpanded = expanded === o.id;
            return (
              <div key={o.id} className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                <button
                  onClick={() => loadItems(o.id)}
                  className="w-full p-3.5 text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                      style={{ color: statusColor, background: `${statusColor}15` }}
                    >
                      {o.status}
                    </span>
                    {o.priority === "urgent" && (
                      <span className="text-[10px] font-bold" style={{ color: "#EF4444" }}>URGENT</span>
                    )}
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                    {new Date(o.order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {o.clinical_notes && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#64748B" }}>{o.clinical_notes}</p>
                  )}
                </button>

                {isExpanded && items[o.id] && (
                  <div className="px-3.5 pb-3.5 space-y-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    {items[o.id].map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-medium" style={{ color: "#0F172A" }}>{item.testName}</span>
                        <div className="text-right">
                          <span
                            className="text-xs font-bold"
                            style={{ color: item.result_flag === "high" || item.result_flag === "low" ? "#EF4444" : "#0F172A" }}
                          >
                            {item.result_value || "—"} {item.result_unit || ""}
                          </span>
                          {item.reference_range && (
                            <p className="text-[10px]" style={{ color: "#94A3B8" }}>Ref: {item.reference_range}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {items[o.id].length === 0 && (
                      <p className="text-xs py-2" style={{ color: "#94A3B8" }}>No test results available yet</p>
                    )}
                  </div>
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

export default PortalReports;
