import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { X, Plus, AlertTriangle, ShieldX, CheckCircle2 } from "lucide-react";
import type { PrescriptionData, DrugEntry, LabOrder, RadiologyOrder } from "../ConsultationWorkspace";
import { checkDrugSafety, type DrugSafetyResult } from "@/lib/drugSafetyCheck";
import DrugSafetyAlertModal from "@/components/opd/DrugSafetyAlertModal";
import AllergyBanner from "@/components/clinical/AllergyBanner";

interface Props {
  prescription: PrescriptionData;
  onChange: (partial: Partial<PrescriptionData>) => void;
  hospitalId: string | null;
  patientAllergies?: string[];
}

const FREQUENCIES = ["OD", "BD", "TDS", "QID", "SOS", "STAT", "HS", "AC", "PC"];
const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual"];

const QUICK_DRUGS: DrugEntry[] = [
  { drug_name: "Paracetamol 500mg", dose: "500mg", route: "Oral", frequency: "BD", duration_days: "3", instructions: "Take after food", quantity: "6", is_stat: false },
  { drug_name: "ORS", dose: "1 sachet", route: "Oral", frequency: "TDS", duration_days: "3", instructions: "Dissolve in 1L water", quantity: "9", is_stat: false },
  { drug_name: "Multivitamin", dose: "1 tab", route: "Oral", frequency: "OD", duration_days: "30", instructions: "Take after breakfast", quantity: "30", is_stat: false },
];

const LAB_CHIPS = ["CBC", "LFT", "KFT", "Blood Sugar (F/PP)", "HbA1c", "Lipid Profile", "Urine R/M", "Thyroid (TSH)"];
const RAD_CHIPS = ["X-Ray Chest", "USG Abdomen", "X-Ray KUB", "ECG", "2D Echo", "CT Brain"];

/** Safety badge icons per drug */
interface DrugSafetyMeta {
  severity: "interaction" | "allergy_override" | "duplicate";
  tooltip: string;
}

const RxOrdersTab: React.FC<Props> = ({ prescription, onChange, hospitalId, patientAllergies = [] }) => {
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ drug_name: string; generic_name: string | null; is_ndps: boolean }[]>([]);
  const [newDrug, setNewDrug] = useState<DrugEntry>({ drug_name: "", dose: "", route: "Oral", frequency: "OD", duration_days: "", instructions: "", quantity: "", is_stat: false });
  const [labInput, setLabInput] = useState("");
  const [radInput, setRadInput] = useState("");

  // Drug safety state
  const [checking, setChecking] = useState(false);
  const [safetyResult, setSafetyResult] = useState<DrugSafetyResult | null>(null);
  const [pendingDrug, setPendingDrug] = useState<DrugEntry | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safeFlash, setSafeFlash] = useState(false);
  const [drugSafetyMeta, setDrugSafetyMeta] = useState<Map<number, DrugSafetyMeta>>(new Map());

  // Drug search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !hospitalId) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("drug_master")
        .select("drug_name, generic_name, is_ndps")
        .eq("hospital_id", hospitalId)
        .ilike("drug_name", `%${searchQuery}%`)
        .limit(8);
      setSearchResults(data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, hospitalId]);

  const performSafetyCheck = async (drug: DrugEntry) => {
    setChecking(true);
    setPendingDrug(drug);

    const currentDrugNames = prescription.drugs.map((d) => d.drug_name);

    try {
      const result = await checkDrugSafety(drug.drug_name, currentDrugNames, patientAllergies);

      if (result.hasIssues) {
        setSafetyResult(result);
        setShowSafetyModal(true);
      } else {
        // Safe — add directly with green flash
        addDrugDirect(drug);
        setSafeFlash(true);
        setTimeout(() => setSafeFlash(false), 1500);
      }
    } catch {
      // On error, still allow adding
      addDrugDirect(drug);
    } finally {
      setChecking(false);
    }
  };

  const addDrugDirect = (drug: DrugEntry) => {
    onChange({ drugs: [...prescription.drugs, drug] });
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewDrug({ drug_name: "", dose: "", route: "Oral", frequency: "OD", duration_days: "", instructions: "", quantity: "", is_stat: false });
    setSearchQuery("");
    setShowAddDrug(false);
    setPendingDrug(null);
  };

  const handleSafetyAddAnyway = () => {
    if (pendingDrug && safetyResult) {
      const newIndex = prescription.drugs.length;
      addDrugDirect(pendingDrug);
      // Mark with interaction badge
      setDrugSafetyMeta((prev) => {
        const next = new Map(prev);
        next.set(newIndex, {
          severity: "interaction",
          tooltip: safetyResult.interactions.map((i) => `${i.drug_a} + ${i.drug_b}: ${i.clinical_effect}`).join("; "),
        });
        return next;
      });
    }
    setShowSafetyModal(false);
    setSafetyResult(null);
  };

  const handleSafetyOverride = (reason: string) => {
    if (pendingDrug && safetyResult) {
      const newIndex = prescription.drugs.length;
      addDrugDirect(pendingDrug);
      // Log override via clinical_alerts
      if (hospitalId) {
        supabase.from("clinical_alerts").insert({
          hospital_id: hospitalId,
          alert_type: "drug_override",
          severity: "critical",
          alert_message: `Drug safety override: ${pendingDrug.drug_name} added despite ${safetyResult.worstSeverity} alert. Reason: ${reason}`,
        }).then(() => {});
      }
      setDrugSafetyMeta((prev) => {
        const next = new Map(prev);
        next.set(newIndex, {
          severity: "allergy_override",
          tooltip: `Override: ${reason}`,
        });
        return next;
      });
    }
    setShowSafetyModal(false);
    setSafetyResult(null);
  };

  const handleSafetyClose = () => {
    setShowSafetyModal(false);
    setSafetyResult(null);
    setPendingDrug(null);
  };

  const removeDrug = (i: number) => {
    onChange({ drugs: prescription.drugs.filter((_, idx) => idx !== i) });
    setDrugSafetyMeta((prev) => {
      const next = new Map<number, DrugSafetyMeta>();
      prev.forEach((v, k) => {
        if (k < i) next.set(k, v);
        else if (k > i) next.set(k - 1, v);
      });
      return next;
    });
  };

  const addLab = (name: string) => {
    if (!name.trim()) return;
    const exists = prescription.lab_orders.find((l) => l.test_name === name);
    if (exists) return;
    onChange({ lab_orders: [...prescription.lab_orders, { test_name: name, urgency: "routine", clinical_indication: "" }] });
    setLabInput("");
  };

  const removeLab = (i: number) => {
    onChange({ lab_orders: prescription.lab_orders.filter((_, idx) => idx !== i) });
  };

  const addRad = (name: string) => {
    if (!name.trim()) return;
    const exists = prescription.radiology_orders.find((r) => r.study_name === name);
    if (exists) return;
    onChange({ radiology_orders: [...prescription.radiology_orders, { study_name: name, urgency: "routine", clinical_indication: "" }] });
    setRadInput("");
  };

  const removeRad = (i: number) => {
    onChange({ radiology_orders: prescription.radiology_orders.filter((_, idx) => idx !== i) });
  };

  const getSafetyBadge = (index: number) => {
    const meta = drugSafetyMeta.get(index);
    if (!meta) return null;
    if (meta.severity === "allergy_override") {
      return (
        <span title={meta.tooltip} className="inline-flex items-center gap-0.5 text-[9px] bg-red-100 text-destructive px-1.5 py-px rounded-full font-bold cursor-help">
          <ShieldX className="h-2.5 w-2.5" /> Override
        </span>
      );
    }
    return (
      <span title={meta.tooltip} className="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-px rounded-full font-bold cursor-help">
        <AlertTriangle className="h-2.5 w-2.5" /> Interaction
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Allergy Banner — always visible */}
      <AllergyBanner allergies={patientAllergies?.join(", ") || null} />

      {/* Safe flash */}
      {safeFlash && (
        <div className="flex-shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs text-emerald-700 font-medium">✓ No interactions found</span>
        </div>
      )}

      {/* Top: Prescription (60%) */}
      <div className="flex-[3] overflow-y-auto p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-foreground">Prescription</span>
          <button onClick={() => setShowAddDrug(true)} className="text-xs text-primary border border-primary px-2.5 py-1 rounded-md hover:bg-primary/5 flex items-center gap-1 transition-colors">
            <Plus className="h-3 w-3" /> Add Drug
          </button>
        </div>

        {/* Drug list */}
        {prescription.drugs.map((drug, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-2.5 mb-1.5 relative group">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{drug.drug_name}</span>
              {drug.is_ndps && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-px rounded-full font-bold">NDPS</span>}
              {getSafetyBadge(i)}
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {[drug.dose, drug.route, drug.frequency, `${drug.duration_days}d`].filter(Boolean).map((v, j) => (
                <span key={j} className="text-[11px] bg-muted text-muted-foreground px-2 py-px rounded">{v}</span>
              ))}
            </div>
            {drug.instructions && <p className="text-xs text-muted-foreground italic mt-1">{drug.instructions}</p>}
            <button onClick={() => removeDrug(i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}

        {/* Add drug form */}
        {showAddDrug && (
          <div className="border border-border rounded-lg p-3 mt-2 bg-background">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setNewDrug((d) => ({ ...d, drug_name: e.target.value })); }}
                placeholder="Search drug name..."
                className="w-full h-9 px-3 border border-border rounded-lg text-sm outline-none focus:border-primary bg-background text-foreground"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-10 left-0 right-0 bg-background border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => { setNewDrug((d) => ({ ...d, drug_name: r.drug_name, is_ndps: r.is_ndps })); setSearchQuery(r.drug_name); setSearchResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border/50">
                      <span className="font-medium text-foreground">{r.drug_name}</span>
                      {r.generic_name && <span className="text-muted-foreground ml-2 text-xs">{r.generic_name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <input value={newDrug.dose} onChange={(e) => setNewDrug((d) => ({ ...d, dose: e.target.value }))} placeholder="Dose" className="h-8 px-2 border border-border rounded text-xs outline-none bg-background text-foreground" />
              <select value={newDrug.route} onChange={(e) => setNewDrug((d) => ({ ...d, route: e.target.value }))} className="h-8 px-1 border border-border rounded text-xs outline-none bg-background text-foreground">
                {ROUTES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <select value={newDrug.frequency} onChange={(e) => setNewDrug((d) => ({ ...d, frequency: e.target.value }))} className="h-8 px-1 border border-border rounded text-xs outline-none bg-background text-foreground">
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
              <input value={newDrug.duration_days} onChange={(e) => setNewDrug((d) => ({ ...d, duration_days: e.target.value }))} placeholder="Days" className="h-8 px-2 border border-border rounded text-xs outline-none bg-background text-foreground" />
            </div>
            <input value={newDrug.instructions} onChange={(e) => setNewDrug((d) => ({ ...d, instructions: e.target.value }))} placeholder="Instructions (e.g., Take after food)" className="w-full h-8 px-2 mt-2 border border-border rounded text-xs outline-none bg-background text-foreground" />
            {newDrug.is_ndps && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-700">⚠️ NDPS Drug — Dual verification required before dispensing</div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                disabled={checking || !newDrug.drug_name}
                onClick={() => { if (newDrug.drug_name) performSafetyCheck(newDrug); }}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {checking ? (
                  <>
                    <span className="h-3 w-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Checking safety...
                  </>
                ) : (
                  "Add to Prescription"
                )}
              </button>
              <button onClick={() => { setShowAddDrug(false); setSearchQuery(""); }} className="text-xs text-muted-foreground px-3 py-1.5">Cancel</button>
            </div>
          </div>
        )}

        {/* Quick drug shortcuts */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {QUICK_DRUGS.map((qd) => (
            <button key={qd.drug_name} onClick={() => performSafetyCheck(qd)} className="text-[11px] px-2.5 py-1 rounded-full bg-muted/50 border border-border text-muted-foreground hover:bg-muted transition-colors">
              {qd.drug_name} {qd.frequency} × {qd.duration_days}d
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: Lab & Radiology (40%) */}
      <div className="flex-[2] overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Lab Orders */}
          <div>
            <span className="text-xs font-bold text-foreground/70 block mb-2">Lab Orders</span>
            <div className="flex gap-1 mb-2">
              <input value={labInput} onChange={(e) => setLabInput(e.target.value)} placeholder="Test name" className="flex-1 h-7 px-2 border border-border rounded text-xs outline-none bg-background text-foreground"
                onKeyDown={(e) => { if (e.key === "Enter") addLab(labInput); }} />
              <button onClick={() => addLab(labInput)} className="text-xs bg-muted px-2 rounded hover:bg-muted/80">+</button>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {LAB_CHIPS.map((c) => (
                <button key={c} onClick={() => addLab(c)} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground hover:bg-muted">{c}</button>
              ))}
            </div>
            <div className="space-y-1">
              {prescription.lab_orders.map((l, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <span className="text-xs text-foreground/80">{l.test_name}</span>
                  <button onClick={() => removeLab(i)}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Radiology Orders */}
          <div>
            <span className="text-xs font-bold text-foreground/70 block mb-2">Radiology Orders</span>
            <div className="flex gap-1 mb-2">
              <input value={radInput} onChange={(e) => setRadInput(e.target.value)} placeholder="Study name" className="flex-1 h-7 px-2 border border-border rounded text-xs outline-none bg-background text-foreground"
                onKeyDown={(e) => { if (e.key === "Enter") addRad(radInput); }} />
              <button onClick={() => addRad(radInput)} className="text-xs bg-muted px-2 rounded hover:bg-muted/80">+</button>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {RAD_CHIPS.map((c) => (
                <button key={c} onClick={() => addRad(c)} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground hover:bg-muted">{c}</button>
              ))}
            </div>
            <div className="space-y-1">
              {prescription.radiology_orders.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <span className="text-xs text-foreground/80">{r.study_name}</span>
                  <button onClick={() => removeRad(i)}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Safety alert modal */}
      {showSafetyModal && safetyResult && pendingDrug && (
        <DrugSafetyAlertModal
          open={showSafetyModal}
          drugName={pendingDrug.drug_name}
          result={safetyResult}
          onClose={handleSafetyClose}
          onAddAnyway={handleSafetyAddAnyway}
          onOverride={handleSafetyOverride}
        />
      )}
    </div>
  );
};

export default RxOrdersTab;
