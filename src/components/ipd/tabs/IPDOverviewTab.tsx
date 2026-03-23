import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Pill, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  admissionId: string;
  hospitalId: string | null;
  onTabChange: (tab: string) => void;
}

const IPDOverviewTab: React.FC<Props> = ({ admissionId, hospitalId, onTabChange }) => {
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [vitalsTime, setVitalsTime] = useState<string>("");

  useEffect(() => {
    if (!admissionId || !hospitalId) return;
    // Fetch latest vitals
    supabase.from("ipd_vitals")
      .select("*")
      .eq("admission_id", admissionId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setLatestVitals(data[0]);
          const mins = Math.round((Date.now() - new Date(data[0].recorded_at).getTime()) / 60000);
          setVitalsTime(mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`);
        }
      });

    // Fetch active medications
    supabase.from("ipd_medications")
      .select("*")
      .eq("admission_id", admissionId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMedications(data || []));
  }, [admissionId, hospitalId]);

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 h-full max-h-full">
        {/* Card A: Today's Vitals */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-[13px] font-bold text-slate-900">Today's Vitals</span>
            </div>
            {vitalsTime && <span className="text-[11px] text-slate-400">{vitalsTime}</span>}
          </div>
          {latestVitals ? (
            <div className="grid grid-cols-2 gap-2 flex-1">
              <MiniVital label="BP" value={`${latestVitals.bp_systolic || '—'}/${latestVitals.bp_diastolic || '—'}`} unit="mmHg" />
              <MiniVital label="Pulse" value={latestVitals.pulse || '—'} unit="bpm" />
              <MiniVital label="Temp" value={latestVitals.temperature || '—'} unit="°F" />
              <MiniVital label="SpO2" value={latestVitals.spo2 || '—'} unit="%" />
            </div>
          ) : (
            <p className="text-xs text-slate-400 flex-1 flex items-center">No vitals recorded yet</p>
          )}
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7 w-full" onClick={() => onTabChange("vitals")}>
            Add Vitals
          </Button>
        </div>

        {/* Card B: Active Medications */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-4 w-4 text-emerald-500" />
            <span className="text-[13px] font-bold text-slate-900">Active Medications</span>
            <span className="text-[11px] text-slate-400 ml-auto">{medications.length}</span>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {medications.slice(0, 4).map((m) => (
              <div key={m.id} className="text-xs">
                <span className="font-semibold text-slate-800">{m.drug_name}</span>
                <span className="text-slate-400 ml-1">{m.dose} · {m.frequency}</span>
              </div>
            ))}
            {medications.length > 4 && (
              <button onClick={() => onTabChange("medications")} className="text-[11px] text-blue-600 hover:underline">
                + {medications.length - 4} more
              </button>
            )}
            {medications.length === 0 && <p className="text-xs text-slate-400">No active medications</p>}
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7 w-full" onClick={() => onTabChange("medications")}>
            Add Med
          </Button>
        </div>

        {/* Card C: Pending Orders */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-amber-500" />
            <span className="text-[13px] font-bold text-slate-900">Pending Orders</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-emerald-500 font-medium">No pending orders ✓</p>
          </div>
        </div>

        {/* Card D: Discharge Progress */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
            <span className="text-[13px] font-bold text-slate-900">Discharge Progress</span>
          </div>
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-1 w-full">
              {["Medical", "Billing", "Pharmacy", "Summary"].map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                      <span className="text-[8px] text-slate-400">{i + 1}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">{step}</span>
                  </div>
                  {i < 3 && <div className="flex-1 h-px bg-slate-200 mb-4" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniVital = ({ label, value, unit }: { label: string; value: string | number; unit: string }) => (
  <div className="bg-slate-50 rounded-md p-2">
    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</p>
    <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
    <p className="text-[10px] text-slate-400">{unit}</p>
  </div>
);

export default IPDOverviewTab;
