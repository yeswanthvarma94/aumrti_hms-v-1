import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { OTSchedule } from "@/pages/ot/OTPage";

interface Props {
  schedule: OTSchedule;
  onClose: () => void;
  onEnded: () => void;
}

const EndCaseModal: React.FC<Props> = ({ schedule, onClose, onEnded }) => {
  const { toast } = useToast();
  const [postOpDx, setPostOpDx] = useState("");
  const [outcome, setOutcome] = useState("success");
  const [complications, setComplications] = useState("");
  const [saving, setSaving] = useState(false);

  const elapsed = schedule.actual_start_time
    ? Math.round((Date.now() - new Date(schedule.actual_start_time).getTime()) / 60000)
    : 0;

  const handleEnd = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ot_schedules")
      .update({
        status: "completed",
        actual_end_time: new Date().toISOString(),
        post_op_diagnosis: postOpDx || null,
        booking_notes: complications
          ? `${schedule.booking_notes || ""}\n\nComplications: ${complications}`.trim()
          : schedule.booking_notes,
      })
      .eq("id", schedule.id);

    if (error) {
      toast({ title: "Failed to end case", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: `Case completed ✓ — ${schedule.surgery_name} (${elapsed} min)` });
    setSaving(false);
    onEnded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">End Case</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 active:scale-95"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-bold text-foreground">{schedule.surgery_name}</p>
            <p className="text-xs text-muted-foreground">{schedule.patient?.full_name} · {elapsed} min elapsed</p>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Post-op Diagnosis</label>
            <input value={postOpDx} onChange={(e) => setPostOpDx(e.target.value)} placeholder="Final diagnosis after surgery" className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block">Case Outcome</label>
            <div className="space-y-2">
              {[
                { value: "success", label: "Completed Successfully" },
                { value: "complications", label: "Completed with Complications" },
                { value: "abandoned", label: "Abandoned / Converted" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${outcome === opt.value ? "border-primary" : "border-muted-foreground/30"}`}>
                    {outcome === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {outcome === "complications" && (
            <div>
              <label className="text-xs font-medium mb-1 block">Describe complications</label>
              <textarea value={complications} onChange={(e) => setComplications(e.target.value)} rows={2} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-2">
          <button
            onClick={handleEnd}
            disabled={saving}
            className="w-full bg-[hsl(var(--sidebar-accent))] text-white font-semibold py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Ending..." : "✓ End Case & Close OT"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndCaseModal;
