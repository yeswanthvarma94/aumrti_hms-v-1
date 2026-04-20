import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Sparkles, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatientSearchPicker from "@/components/shared/PatientSearchPicker";
import { useHospitalId } from "@/hooks/useHospitalId";
import { callAI } from "@/lib/aiProvider";

const RUBRIC_CATALOG: Record<string, string[]> = {
  Mind: ["Anxiety", "Fear", "Grief", "Irritability", "Restlessness", "Sadness"],
  Head: ["Headache - left side", "Headache - right side", "Headache - both sides", "Vertigo"],
  Stomach: ["Nausea", "Vomiting", "Burning", "Bloating", "Appetite increased", "Appetite decreased"],
  Chest: ["Palpitation", "Breathlessness", "Cough - dry", "Cough - productive"],
  Extremities: ["Joint pain - knee", "Joint pain - shoulder", "Joint pain - back", "Weakness", "Numbness"],
  Skin: ["Itching", "Eruptions", "Dryness"],
  Generals: ["Chilliness", "Heat", "Thirst increased", "Thirst decreased", "Sweat"],
};

const MODALITY_OPTIONS = ["agg. cold", "agg. heat", "agg. night", "agg. motion", "amel. rest", "amel. warmth", "amel. open air", "amel. lying down"];

interface Rubric {
  category: string;
  symptom: string;
  modality: string;
}

interface Remedy {
  remedy: string;
  potency: string;
  keynotes: string;
  suitability_score: number;
}

export default function HomeopathyTab() {
  const { hospitalId } = useHospitalId();
  const [patientId, setPatientId] = useState("");
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [category, setCategory] = useState("Mind");
  const [symptom, setSymptom] = useState("");
  const [modality, setModality] = useState("");
  const [remedies, setRemedies] = useState<Remedy[]>([]);
  const [prescribed, setPrescribed] = useState("");
  const [prescribedPotency, setPrescribedPotency] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const addRubric = () => {
    if (!symptom) return toast.error("Select a symptom");
    setRubrics([...rubrics, { category, symptom, modality }]);
    setSymptom("");
    setModality("");
  };

  const removeRubric = (idx: number) => setRubrics(rubrics.filter((_, i) => i !== idx));

  const analyze = async () => {
    if (rubrics.length === 0) return toast.error("Add at least one rubric");
    if (!hospitalId) return toast.error("Hospital not loaded");
    setAnalyzing(true);
    try {
      const list = rubrics.map(r => `${r.category} > ${r.symptom}${r.modality ? ` (${r.modality})` : ""}`).join("; ");
      const prompt = `Patient has these homeopathic symptoms/rubrics: ${list}. Based on classical homeopathic repertorization principles (Kent, Boericke), suggest the top 5 constitutional remedies with potency recommendation. Return ONLY a JSON array, no prose: [{ "remedy": "Remedy Name", "potency": "30C|200C|1M", "keynotes": "short keynote indications", "suitability_score": 0-10 }]`;
      const res = await callAI({ featureKey: "homeopathy_repertorization", hospitalId, prompt, maxTokens: 800 });
      const text = res.text || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Could not parse AI response");
      const parsed: Remedy[] = JSON.parse(match[0]);
      setRemedies(parsed.sort((a, b) => (b.suitability_score || 0) - (a.suitability_score || 0)).slice(0, 5));
      toast.success("Repertorization complete");
    } catch (e: any) {
      toast.error(e.message || "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!patientId) return toast.error("Select a patient");
    if (!hospitalId) return toast.error("Hospital not loaded");
    if (rubrics.length === 0) return toast.error("Add rubrics before saving");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: u } = await supabase.from("users").select("id").eq("auth_user_id", user!.id).maybeSingle();
      const { error } = await (supabase as any).from("ayush_homeopathy_cases").insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        rubrics,
        suggested_remedies: remedies,
        prescribed_remedy: prescribed || null,
        prescribed_potency: prescribedPotency || null,
        practitioner_id: u?.id || null,
        follow_up_date: followUp || null,
        notes: notes || null,
      });
      if (error) throw error;
      toast.success("Repertorization saved");
      setRubrics([]); setRemedies([]); setPrescribed(""); setPrescribedPotency(""); setFollowUp(""); setNotes("");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Patient *</Label>
              <PatientSearchPicker hospitalId={hospitalId || ""} value={patientId} onChange={setPatientId} />
            </div>
            <div>
              <Label className="text-xs">Follow-up Date</Label>
              <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Rubrics / Symptoms</h3>
            <Badge variant="outline">{rubrics.length} added</Badge>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <Select value={category} onValueChange={(v) => { setCategory(v); setSymptom(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(RUBRIC_CATALOG).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-4">
              <Select value={symptom} onValueChange={setSymptom}>
                <SelectTrigger><SelectValue placeholder="Symptom" /></SelectTrigger>
                <SelectContent>
                  {RUBRIC_CATALOG[category].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-4">
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger><SelectValue placeholder="Modality (optional)" /></SelectTrigger>
                <SelectContent>
                  {MODALITY_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={addRubric} className="col-span-1"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rubrics.map((r, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                <span className="font-semibold">{r.category}:</span> {r.symptom}
                {r.modality && <span className="text-muted-foreground"> ({r.modality})</span>}
                <button onClick={() => removeRubric(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <Button onClick={analyze} disabled={analyzing || rubrics.length === 0} className="w-full">
            {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Repertorize with AI
          </Button>
        </CardContent>
      </Card>

      {remedies.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">Top Suggested Remedies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {remedies.map((r, i) => (
                <Card key={i} className={`cursor-pointer border-2 ${prescribed === r.remedy ? "border-primary" : "border-border"}`}
                  onClick={() => { setPrescribed(r.remedy); setPrescribedPotency(r.potency); }}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-bold text-sm">{i + 1}. {r.remedy}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.potency}</p>
                      </div>
                      <Badge variant={r.suitability_score >= 8 ? "default" : "secondary"}>{r.suitability_score}/10</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.keynotes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3 space-y-3">
          <h3 className="text-sm font-semibold">Prescription & Notes</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prescribed Remedy</Label>
              <Input value={prescribed} onChange={(e) => setPrescribed(e.target.value)} placeholder="e.g. Pulsatilla" />
            </div>
            <div>
              <Label className="text-xs">Potency</Label>
              <Input value={prescribedPotency} onChange={(e) => setPrescribedPotency(e.target.value)} placeholder="e.g. 200C" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Repertorization
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
