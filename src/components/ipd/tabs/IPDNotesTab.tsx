import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  admissionId: string;
  hospitalId: string | null;
  userId: string | null;
}

// Simple local-only notes for now (will be backed by a notes table in Phase 5)
const IPDNotesTab: React.FC<Props> = ({ admissionId }) => {
  const [notes, setNotes] = useState<{ id: number; text: string; time: string; role: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [showForm, setShowForm] = useState(false);

  const addNote = () => {
    if (!draft.trim()) return;
    setNotes([{ id: Date.now(), text: draft, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), role: "Nurse" }, ...notes]);
    setDraft("");
    setShowForm(false);
    toast({ title: "Note added" });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-[13px] font-bold text-slate-900">Nursing & Misc Notes</span>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-[#1A2F5A] hover:bg-[#152647] text-xs h-7">
          {showForm ? "Cancel" : "+ Add Note"}
        </Button>
      </div>

      {showForm && (
        <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg p-3 mb-3">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your note..." className="h-20 text-xs resize-none" />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={addNote} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7">Save</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400">{n.time}</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-px rounded">{n.role}</span>
            </div>
            <p className="text-xs text-slate-700">{n.text}</p>
          </div>
        ))}
        {notes.length === 0 && !showForm && (
          <div className="text-center py-12 text-sm text-slate-400">No notes yet. Click "+ Add Note" to begin.</div>
        )}
      </div>
    </div>
  );
};

export default IPDNotesTab;
