import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { BedData } from "@/pages/ipd/IPDPage";

interface Props {
  beds: BedData[];
  selectedBedId: string | null;
  onSelectBed: (id: string) => void;
  hospitalId: string | null;
  loading: boolean;
  onRefresh: () => void;
  onNewAdmission: () => void;
}

const statusColors: Record<string, { bg: string; border: string; hoverBorder: string }> = {
  available: { bg: "bg-green-50", border: "border-green-300", hoverBorder: "hover:border-green-500" },
  occupied: { bg: "bg-red-50", border: "border-red-300", hoverBorder: "hover:border-red-500" },
  cleaning: { bg: "bg-amber-50", border: "border-amber-300", hoverBorder: "hover:border-amber-500" },
  reserved: { bg: "bg-blue-50", border: "border-blue-300", hoverBorder: "hover:border-blue-500" },
  maintenance: { bg: "bg-slate-100", border: "border-slate-300", hoverBorder: "" },
};

const BedMap: React.FC<Props> = ({ beds, selectedBedId, onSelectBed, hospitalId, loading, onRefresh, onNewAdmission }) => {
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [activeWard, setActiveWard] = useState<string>("all");

  useEffect(() => {
    if (!hospitalId) return;
    supabase.from("wards").select("id, name").eq("hospital_id", hospitalId).eq("is_active", true)
      .then(({ data }) => setWards(data || []));
  }, [hospitalId]);

  const filtered = useMemo(() => {
    if (activeWard === "all") return beds;
    return beds.filter((b) => b.ward_id === activeWard);
  }, [beds, activeWard]);

  const total = filtered.length;
  const occupied = filtered.filter((b) => b.status === "occupied").length;
  const available = filtered.filter((b) => b.status === "available").length;
  const cleaning = filtered.filter((b) => b.status === "cleaning").length;
  const reserved = filtered.filter((b) => b.status === "reserved").length;
  const occPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const occPill = occPct < 70
    ? "bg-green-100 text-green-700"
    : occPct < 90 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="w-[300px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-slate-100">
        <span className="text-sm font-bold text-slate-900">Bed Map</span>
        <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full", occPill)}>
          {occupied}/{total} Occupied
        </span>
      </div>

      {/* Ward tabs */}
      <div className="flex-shrink-0 h-10 flex items-center gap-1.5 px-3 overflow-x-auto no-scrollbar border-b border-slate-100">
        <button
          onClick={() => setActiveWard("all")}
          className={cn("text-xs px-3 py-1 rounded-md whitespace-nowrap transition-colors",
            activeWard === "all" ? "bg-[#1A2F5A] text-white" : "text-slate-500 hover:bg-slate-100"
          )}
        >All Wards</button>
        {wards.map((w) => (
          <button key={w.id} onClick={() => setActiveWard(w.id)}
            className={cn("text-xs px-3 py-1 rounded-md whitespace-nowrap transition-colors",
              activeWard === w.id ? "bg-[#1A2F5A] text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >{w.name}</button>
        ))}
      </div>

      {/* Occupancy summary */}
      <div className="flex-shrink-0 h-8 bg-slate-50 border-b border-slate-100 flex items-center gap-3 px-4">
        <span className="text-[11px] text-emerald-500 font-medium">🟢 {available} Free</span>
        <span className="text-[11px] text-red-500 font-medium">🔴 {occupied} Occupied</span>
        <span className="text-[11px] text-amber-500 font-medium">🟡 {cleaning} Cleaning</span>
        <span className="text-[11px] text-blue-500 font-medium">🔵 {reserved} Reserved</span>
      </div>

      {/* Bed grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">No beds found</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((bed) => {
              const colors = statusColors[bed.status] || statusColors.maintenance;
              const isSelected = bed.id === selectedBedId;
              return (
                <button
                  key={bed.id}
                  onClick={() => onSelectBed(bed.id)}
                  className={cn(
                    "h-14 rounded-lg border-[1.5px] flex flex-col items-center justify-center transition-all relative",
                    colors.bg, colors.border, colors.hoverBorder,
                    isSelected && "ring-2 ring-[#1A2F5A]"
                  )}
                >
                  <span className="text-[11px] font-bold text-slate-700">{bed.bed_number}</span>
                  {bed.status === "occupied" && bed.admission ? (
                    <>
                      <span className="text-[14px] font-bold text-slate-800 leading-none">{bed.admission.patient_initials}</span>
                      <span className="text-[9px] text-slate-500">Day {bed.admission.los_days}</span>
                    </>
                  ) : bed.status === "available" ? (
                    <Plus className="h-5 w-5 text-green-500" />
                  ) : bed.status === "cleaning" ? (
                    <span className="text-sm">🧹</span>
                  ) : bed.status === "reserved" ? (
                    <span className="text-[10px] text-blue-500 font-medium">Rsv</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-100 p-2">
        <button className="w-full h-9 bg-[#1A2F5A] text-white rounded-lg text-[13px] font-semibold hover:bg-[#152647] active:scale-[0.98] transition-all">
          + New Admission
        </button>
      </div>
    </div>
  );
};

export default BedMap;
