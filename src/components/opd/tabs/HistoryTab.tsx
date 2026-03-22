import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { OpdToken } from "@/pages/opd/OPDPage";

interface Props {
  token: OpdToken;
  encounterId: string | null;
}

interface PastEncounter {
  id: string;
  visit_date: string;
  diagnosis: string | null;
  chief_complaint: string | null;
  soap_assessment: string | null;
  soap_plan: string | null;
  vitals: Record<string, unknown> | null;
  doctor_id: string;
}

const CONDITION_CHIPS = [
  "Hypertension", "Diabetes", "Asthma", "COPD", "CAD",
  "Hypothyroidism", "CKD", "Epilepsy", "Arthritis",
];

const HistoryTab: React.FC<Props> = ({ token, encounterId }) => {
  const [conditions, setConditions] = useState<string[]>(token.patient?.chronic_conditions || []);
  const [condInput, setCondInput] = useState("");
  const [pastVisits, setPastVisits] = useState<PastEncounter[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setConditions(token.patient?.chronic_conditions || []);
  }, [token.patient_id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opd_encounters")
        .select("id, visit_date, diagnosis, chief_complaint, soap_assessment, soap_plan, vitals, doctor_id")
        .eq("patient_id", token.patient_id)
        .neq("id", encounterId || "00000000-0000-0000-0000-000000000000")
        .order("visit_date", { ascending: false })
        .limit(3);
      setPastVisits((data as PastEncounter[]) || []);
    })();
  }, [token.patient_id, encounterId]);

  const addCondition = (name: string) => {
    if (!name.trim() || conditions.includes(name)) return;
    const next = [...conditions, name];
    setConditions(next);
    setCondInput("");
    supabase.from("patients").update({ chronic_conditions: next }).eq("id", token.patient_id);
  };

  const removeCondition = (name: string) => {
    const next = conditions.filter((c) => c !== name);
    setConditions(next);
    supabase.from("patients").update({ chronic_conditions: next }).eq("id", token.patient_id);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Chronic Conditions */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-2 block">Chronic Conditions</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {conditions.map((c) => (
            <span key={c} className="text-xs bg-blue-50 text-[#1A2F5A] border border-blue-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
              {c}
              <button onClick={() => removeCondition(c)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1 mb-2">
          <input value={condInput} onChange={(e) => setCondInput(e.target.value)} placeholder="Add condition" className="flex-1 h-8 px-2 border border-slate-200 rounded text-xs outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") addCondition(condInput); }} />
          <button onClick={() => addCondition(condInput)} className="text-xs bg-slate-100 px-2 rounded hover:bg-slate-200">+</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {CONDITION_CHIPS.filter((c) => !conditions.includes(c)).map((c) => (
            <button key={c} onClick={() => addCondition(c)} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100">{c}</button>
          ))}
        </div>
      </div>

      {/* Previous Visits */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-2 block">Previous OPD Visits</label>
        {pastVisits.length === 0 ? (
          <p className="text-xs text-slate-400">No previous visits on record</p>
        ) : (
          <div className="space-y-2">
            {pastVisits.map((visit) => (
              <div key={visit.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === visit.id ? null : visit.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">{new Date(visit.visit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span className="font-medium text-slate-900">{visit.diagnosis || "No diagnosis"}</span>
                  </div>
                  {expanded === visit.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {expanded === visit.id && (
                  <div className="border-t border-slate-100 p-3 bg-slate-50 text-xs space-y-2">
                    {visit.chief_complaint && <div><span className="font-bold text-slate-600">Complaint:</span> <span className="text-slate-700">{visit.chief_complaint}</span></div>}
                    {visit.soap_assessment && <div><span className="font-bold text-slate-600">Assessment:</span> <span className="text-slate-700">{visit.soap_assessment}</span></div>}
                    {visit.soap_plan && <div><span className="font-bold text-slate-600">Plan:</span> <span className="text-slate-700">{visit.soap_plan}</span></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
