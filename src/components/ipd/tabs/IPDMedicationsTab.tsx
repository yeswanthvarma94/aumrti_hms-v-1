import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  admissionId: string;
  hospitalId: string | null;
  userId: string | null;
}

interface Med {
  id: string;
  drug_name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
}

const routes = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual"];
const frequencies = ["OD", "BD", "TDS", "QID", "SOS", "STAT", "HS", "Q4H", "Q6H", "Q8H", "Q12H"];

const IPDMedicationsTab: React.FC<Props> = ({ admissionId, hospitalId, userId }) => {
  const [meds, setMeds] = useState<Med[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [form, setForm] = useState({ drug_name: "", dose: "", route: "Oral", frequency: "BD" });
  const [saving, setSaving] = useState(false);

  const fetchMeds = useCallback(() => {
    if (!admissionId) return;
    supabase.from("ipd_medications")
      .select("*")
      .eq("admission_id", admissionId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setMeds((data as unknown as Med[]) || []));
  }, [admissionId]);

  useEffect(() => { fetchMeds(); }, [fetchMeds]);

  useEffect(() => {
    if (drugSearch.length < 2 || !hospitalId) { setDrugResults([]); return; }
    const t = setTimeout(() => {
      supabase.from("drug_master")
        .select("drug_name, generic_name")
        .eq("hospital_id", hospitalId)
        .ilike("drug_name", `%${drugSearch}%`)
        .limit(8)
        .then(({ data }) => setDrugResults(data || []));
    }, 200);
    return () => clearTimeout(t);
  }, [drugSearch, hospitalId]);

  const handleAdd = async () => {
    if (!form.drug_name || !hospitalId || !userId) return;
    setSaving(true);
    const { error } = await supabase.from("ipd_medications").insert({
      admission_id: admissionId,
      hospital_id: hospitalId,
      ordered_by: userId,
      drug_name: form.drug_name,
      dose: form.dose || null,
      route: form.route,
      frequency: form.frequency,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${form.drug_name} added` });
    setForm({ drug_name: "", dose: "", route: "Oral", frequency: "BD" });
    setDrugSearch("");
    setShowAdd(false);
    fetchMeds();
  };

  const stopMed = async (id: string) => {
    await supabase.from("ipd_medications").update({ is_active: false, end_date: new Date().toISOString().split("T")[0] }).eq("id", id);
    toast({ title: "Medication stopped" });
    fetchMeds();
  };

  const activeMeds = meds.filter((m) => m.is_active);
  const stoppedMeds = meds.filter((m) => !m.is_active);

  return (
    <div className="h-full flex flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-[13px] font-bold text-slate-900">Active Medications ({activeMeds.length})</span>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-[#1A2F5A] hover:bg-[#152647] text-xs h-7">
          {showAdd ? "Cancel" : "+ Add Drug"}
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg p-3 mb-3">
          <div className="relative mb-2">
            <Input value={drugSearch} onChange={(e) => { setDrugSearch(e.target.value); setForm({ ...form, drug_name: e.target.value }); }}
              placeholder="Search drug..." className="h-8 text-xs" />
            {drugResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                {drugResults.map((d, i) => (
                  <button key={i} onClick={() => { setForm({ ...form, drug_name: d.drug_name }); setDrugSearch(d.drug_name); setDrugResults([]); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <span className="font-medium">{d.drug_name}</span>
                    {d.generic_name && <span className="text-slate-400 ml-1">({d.generic_name})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="Dose" className="h-8 text-xs" />
            <select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} className="h-8 text-xs border rounded-md px-2 bg-white">
              {routes.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="h-8 text-xs border rounded-md px-2 bg-white">
              {frequencies.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <Button size="sm" onClick={handleAdd} disabled={saving || !form.drug_name} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
              {saving ? "..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {/* Medications list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {activeMeds.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">{m.drug_name}</span>
              <div className="flex items-center gap-2">
                {m.route && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-px rounded">{m.route}</span>}
                <button onClick={() => stopMed(m.id)} className="text-[11px] text-red-500 hover:underline">Stop</button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {m.dose || "—"} · {m.frequency || "—"} · Since {m.start_date || "today"}
            </p>
          </div>
        ))}
        {activeMeds.length === 0 && !showAdd && (
          <div className="text-center py-12 text-sm text-slate-400">No active medications</div>
        )}

        {stoppedMeds.length > 0 && (
          <>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-4 mb-1">Stopped</p>
            {stoppedMeds.map((m) => (
              <div key={m.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 opacity-60">
                <span className="text-xs text-slate-600 line-through">{m.drug_name}</span>
                <span className="text-[11px] text-slate-400 ml-2">{m.dose} · {m.frequency}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default IPDMedicationsTab;
