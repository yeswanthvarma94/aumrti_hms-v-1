import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Test {
  id: string;
  test_name: string;
  test_code: string | null;
  category: string;
  sample_type: string;
  unit: string | null;
  normal_min: number | null;
  normal_max: number | null;
  tat_minutes: number;
}

interface Patient {
  id: string;
  full_name: string;
  uhid: string;
  gender: string | null;
  dob: string | null;
}

// Panel presets mapping test_codes to panel names
const PANELS: { label: string; codes: string[] }[] = [
  { label: "CBC + ESR", codes: ["HGB", "WBC", "PLT", "HCT", "MCV", "MCH", "MCHC", "ESR"] },
  { label: "Liver Function", codes: ["TBIL", "DBIL", "AST", "ALT", "ALP", "TP", "ALB"] },
  { label: "Kidney Function", codes: ["UREA", "CREAT", "UA", "NA", "K", "CL"] },
  { label: "Lipid Profile", codes: ["CHOL", "TG", "HDL", "LDL"] },
  { label: "Thyroid Profile", codes: ["TSH", "T3", "T4", "FT3", "FT4"] },
  { label: "Diabetes Profile", codes: ["FBS", "PPBS", "HBA1C"] },
  { label: "Electrolytes", codes: ["NA", "K", "CL", "CA"] },
  { label: "Urine R/M", codes: ["URM"] },
  { label: "Blood Culture", codes: ["BCS"] },
  { label: "Fever Panel", codes: ["HGB", "WBC", "PLT", "HCT", "MCV", "MCH", "MCHC", "ESR", "CRP", "WID", "DENG", "MAL"] },
];

interface Props {
  hospitalId: string;
  onClose: () => void;
  onCreated: () => void;
}

const NewLabOrderModal: React.FC<Props> = ({ hospitalId, onClose, onCreated }) => {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState<Test[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkedEncounter, setLinkedEncounter] = useState<string | null>(null);
  const [linkedAdmission, setLinkedAdmission] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<string | null>(null);

  // Fetch all tests
  useEffect(() => {
    supabase
      .from("lab_test_master")
      .select("id, test_name, test_code, category, sample_type, unit, normal_min, normal_max, tat_minutes")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("test_name")
      .then(({ data }) => setAllTests((data as any) || []));
  }, [hospitalId]);

  // Search patients
  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return; }
    const q = `%${patientSearch}%`;
    supabase
      .from("patients")
      .select("id, full_name, uhid, gender, dob")
      .eq("hospital_id", hospitalId)
      .or(`full_name.ilike.${q},uhid.ilike.${q},phone.ilike.${q}`)
      .limit(8)
      .then(({ data }) => {
        setPatients((data as any) || []);
        setShowPatientResults(true);
      });
  }, [patientSearch, hospitalId]);

  // Auto-link encounter/admission
  useEffect(() => {
    if (!selectedPatient) { setLinkedEncounter(null); setLinkedAdmission(null); setLinkInfo(null); return; }
    const today = new Date().toISOString().split("T")[0];
    // Check OPD encounter
    supabase
      .from("opd_encounters")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("patient_id", selectedPatient.id)
      .eq("visit_date", today)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLinkedEncounter(data[0].id);
          setLinkInfo("🔗 Linking to today's OPD encounter");
        }
      });
    // Check IPD admission
    supabase
      .from("admissions")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("patient_id", selectedPatient.id)
      .eq("status", "active")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLinkedAdmission(data[0].id);
          setLinkInfo((prev) => prev ? prev + " & IPD admission" : "🔗 Linking to active IPD admission");
        }
      });
  }, [selectedPatient, hospitalId]);

  const addTest = (test: Test) => {
    if (!selectedTests.find((t) => t.id === test.id)) {
      setSelectedTests((prev) => [...prev, test]);
    }
  };

  const removeTest = (testId: string) => {
    setSelectedTests((prev) => prev.filter((t) => t.id !== testId));
  };

  const addPanel = (codes: string[]) => {
    const panelTests = allTests.filter((t) => t.test_code && codes.includes(t.test_code));
    setSelectedTests((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      return [...prev, ...panelTests.filter((t) => !existing.has(t.id))];
    });
    // Auto-set priority for blood culture
    if (codes.includes("BCS") && priority === "routine") {
      setPriority("urgent");
    }
  };

  const filteredTests = testSearch.length > 0
    ? allTests.filter((t) =>
        t.test_name.toLowerCase().includes(testSearch.toLowerCase()) ||
        (t.test_code && t.test_code.toLowerCase().includes(testSearch.toLowerCase()))
      )
    : [];

  const handleSubmit = async () => {
    if (!selectedPatient) { toast({ title: "Please select a patient", variant: "destructive" }); return; }
    if (selectedTests.length === 0) { toast({ title: "Please select at least one test", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", user.id).limit(1).single();
      if (!userData) throw new Error("User record not found");

      // Insert lab order
      const { data: order, error: orderErr } = await supabase
        .from("lab_orders")
        .insert({
          hospital_id: hospitalId,
          patient_id: selectedPatient.id,
          ordered_by: userData.id,
          priority,
          clinical_notes: clinicalNotes || null,
          encounter_id: linkedEncounter,
          admission_id: linkedAdmission,
          status: "ordered",
        })
        .select("id")
        .single();

      if (orderErr || !order) throw orderErr || new Error("Failed to create order");

      // Insert order items
      const items = selectedTests.map((t) => ({
        hospital_id: hospitalId,
        lab_order_id: order.id,
        test_id: t.id,
        status: "ordered" as const,
        result_unit: t.unit,
        reference_range: t.normal_min != null && t.normal_max != null
          ? `${t.normal_min}–${t.normal_max} ${t.unit || ""}`
          : t.normal_max != null ? `< ${t.normal_max} ${t.unit || ""}` : null,
      }));

      const { error: itemsErr } = await supabase.from("lab_order_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Insert samples (one per unique sample_type)
      const sampleTypes = [...new Set(selectedTests.map((t) => t.sample_type))];
      const samples = sampleTypes.map((st) => ({
        hospital_id: hospitalId,
        lab_order_id: order.id,
        sample_type: st,
        barcode: `BC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        status: "pending" as const,
      }));
      await supabase.from("lab_samples").insert(samples);

      // STAT alert
      if (priority === "stat") {
        await supabase.from("clinical_alerts").insert({
          hospital_id: hospitalId,
          alert_type: "stat_lab_order",
          severity: "high",
          alert_message: `STAT lab order for ${selectedPatient.full_name}: ${selectedTests.map((t) => t.test_name).join(", ")}`,
          patient_id: selectedPatient.id,
        });
      }

      toast({ title: `✓ Lab order created — ${selectedTests.length} tests ordered` });
      onCreated();
    } catch (err: any) {
      console.error("Lab order error:", err);
      toast({ title: "Failed to create lab order", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">New Lab Order</DialogTitle>
          <p className="text-sm text-muted-foreground">Search patient, select tests, set priority</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Patient Search */}
          <div>
            <label className="text-sm font-medium text-foreground">Patient *</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5 mt-1">
                <div>
                  <p className="text-sm font-semibold">{selectedPatient.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPatient.uhid}</p>
                </div>
                <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by name, UHID, phone..."
                  className="pl-9"
                />
                {showPatientResults && patients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setShowPatientResults(false); setPatientSearch(""); }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                      >
                        <span className="font-medium">{p.full_name}</span>
                        <span className="text-xs text-muted-foreground">{p.uhid}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {linkInfo && (
              <div className="mt-2 text-xs bg-blue-50 border-l-[3px] border-blue-500 text-blue-700 px-3 py-2 rounded-r">
                {linkInfo}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-foreground">Priority *</label>
            <div className="flex gap-2 mt-1">
              {(["routine", "urgent", "stat"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 h-10 rounded-lg text-sm font-medium border transition-colors",
                    priority === p
                      ? p === "stat" ? "bg-destructive/10 border-destructive text-destructive"
                        : p === "urgent" ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {p === "routine" ? "🟢 Routine" : p === "urgent" ? "🟡 Urgent" : "🔴 STAT"}
                </button>
              ))}
            </div>
            {priority === "stat" && (
              <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg">
                STAT orders are processed immediately. Please inform the lab verbally as well.
              </div>
            )}
          </div>

          {/* Test Selection */}
          <div>
            <label className="text-sm font-medium text-foreground">Select Tests *</label>
            
            {/* Quick panels */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PANELS.map((panel) => (
                <button
                  key={panel.label}
                  onClick={() => addPanel(panel.codes)}
                  className="px-3 py-1.5 text-xs bg-muted border border-border rounded-md text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors"
                >
                  {panel.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mt-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="Search tests by name or code..."
                className="pl-9"
              />
              {filteredTests.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredTests.slice(0, 10).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { addTest(t); setTestSearch(""); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                    >
                      <span>{t.test_name}</span>
                      <span className="text-xs text-muted-foreground">{t.test_code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected tests */}
            {selectedTests.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">{selectedTests.length} test(s) selected</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTests.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/5 text-primary text-xs rounded-full"
                    >
                      {t.test_name}
                      <button onClick={() => removeTest(t.id)} className="hover:text-destructive">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="text-sm font-medium text-foreground">Clinical Notes / Indication</label>
            <Textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Reason for test, relevant history..."
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 h-12 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedPatient || selectedTests.length === 0}
              className="flex-[2] h-12 rounded-lg bg-[hsl(var(--sidebar-background))] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? "Creating..." : "📋 Create Lab Order →"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewLabOrderModal;
