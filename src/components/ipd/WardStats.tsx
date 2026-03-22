import React from "react";
import { cn } from "@/lib/utils";
import type { AdmissionRow } from "@/pages/ipd/IPDPage";

interface Props {
  admissions: AdmissionRow[];
  onSelectBed: (bedId: string) => void;
}

const typeBorder: Record<string, string> = {
  emergency: "border-l-red-500",
  elective: "border-l-blue-500",
  daycare: "border-l-emerald-500",
  transfer: "border-l-amber-500",
};

const WardStats: React.FC<Props> = ({ admissions, onSelectBed }) => {
  const today = new Date().toISOString().split("T")[0];
  const dischargeToday = admissions.filter((a) => a.expected_discharge_date === today);

  return (
    <div className="w-[300px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Currently admitted */}
      <div className="flex-1 overflow-y-auto p-4">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
          Currently Admitted ({admissions.length})
        </label>

        {admissions.length === 0 ? (
          <p className="text-xs text-slate-400">No active admissions</p>
        ) : (
          <div className="space-y-1.5">
            {admissions.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectBed(a.bed_id)}
                className={cn(
                  "w-full text-left bg-slate-50 rounded-lg p-2.5 border-l-[3px] hover:bg-slate-100 transition-colors",
                  typeBorder[a.admission_type] || "border-l-slate-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-900 truncate max-w-[170px]">{a.patient_name}</span>
                  <span className="text-[10px] bg-blue-50 text-[#1A2F5A] px-1.5 py-px rounded font-medium">Day {a.los_days}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Bed: {a.ward_name} - {a.bed_number}</p>
                <p className="text-[11px] text-slate-400">Dr. {a.doctor_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Discharge today */}
      <div className="flex-shrink-0 border-t border-slate-100 p-4">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Expected Discharge Today
        </label>
        {dischargeToday.length === 0 ? (
          <p className="text-xs text-slate-400">No planned discharges today</p>
        ) : (
          <div className="space-y-1.5">
            {dischargeToday.map((a) => (
              <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs font-bold text-slate-900">{a.patient_name}</p>
                <p className="text-[11px] text-slate-500">{a.ward_name} - {a.bed_number}</p>
                <button
                  onClick={() => onSelectBed(a.bed_id)}
                  className="mt-1.5 text-[11px] bg-amber-600 text-white px-2.5 py-1 rounded font-medium hover:bg-amber-700 transition-colors"
                >
                  Initiate Discharge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WardStats;
