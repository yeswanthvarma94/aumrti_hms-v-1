import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface QuizBuilderModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  courseName: string;
  onChanged?: () => void;
}

interface BuilderQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: { text: string; is_correct: boolean }[];
  explanation: string | null;
}

const blankMcq = () => ({
  question_text: "",
  question_type: "mcq",
  options: [
    { text: "", is_correct: true },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ],
  explanation: "",
});

export default function QuizBuilderModal({
  open, onOpenChange, courseId, courseName, onChanged,
}: QuizBuilderModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [draft, setDraft] = useState(blankMcq());

  useEffect(() => { if (open && courseId) load(); }, [open, courseId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lms_quiz_questions")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setQuestions((data || []) as unknown as BuilderQuestion[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!draft.question_text.trim()) { toast.error("Question text required"); return; }
    const opts = draft.options.filter(o => o.text.trim());
    if (opts.length < 2) { toast.error("At least 2 options required"); return; }
    if (!opts.some(o => o.is_correct)) { toast.error("Mark one option as correct"); return; }
    setSaving(true);
    const { error } = await supabase.from("lms_quiz_questions").insert({
      course_id: courseId,
      question_text: draft.question_text,
      question_type: draft.question_type,
      options: opts,
      explanation: draft.explanation || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Question added");
    setDraft(blankMcq());
    await load();
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("lms_quiz_questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await load();
    onChanged?.();
  };

  const setType = (t: string) => {
    if (t === "true_false") {
      setDraft(p => ({
        ...p, question_type: t,
        options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }],
      }));
    } else {
      setDraft(p => ({ ...p, question_type: t, options: blankMcq().options }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manage Questions
            <Badge variant="outline" className="font-normal">{courseName}</Badge>
            <Badge>{questions.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold text-muted-foreground">Existing Questions</p>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : questions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No questions yet — add one below.</p>
          ) : (
            questions.map((q, i) => (
              <div key={q.id} className="border rounded-lg p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium mb-1">{i + 1}. {q.question_text}</p>
                    <div className="space-y-0.5 ml-3">
                      {q.options.map((o, idx) => (
                        <div key={idx} className={`flex items-center gap-1 ${o.is_correct ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>
                          {o.is_correct && <CheckCircle2 className="h-3 w-3" />}
                          <span>{String.fromCharCode(65 + idx)}. {o.text}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && <p className="mt-1 text-[11px] text-muted-foreground italic">💡 {q.explanation}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => handleDelete(q.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Add Question</p>
          <div>
            <Label className="text-xs">Question Text</Label>
            <Textarea rows={2} value={draft.question_text}
              onChange={e => setDraft(p => ({ ...p, question_text: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={draft.question_type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ (4 options)</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Options — select the correct answer</Label>
            {draft.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="qb_correct"
                  checked={opt.is_correct}
                  onChange={() => setDraft(p => ({
                    ...p,
                    options: p.options.map((o, i) => ({ ...o, is_correct: i === idx })),
                  }))}
                  className="h-4 w-4"
                />
                <Input
                  value={opt.text}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  onChange={e => setDraft(p => ({
                    ...p,
                    options: p.options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o),
                  }))}
                  disabled={draft.question_type === "true_false"}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs">Explanation (optional, shown after answering)</Label>
            <Textarea rows={2} value={draft.explanation}
              onChange={e => setDraft(p => ({ ...p, explanation: e.target.value }))} />
          </div>

          <Button onClick={handleAdd} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Add Question
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
