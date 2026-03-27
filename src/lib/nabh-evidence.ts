import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-log NABH evidence for a given criterion.
 * Updates the nabh_criteria row matching hospitalId + criterionNumber
 * with evidence text. If no matching row exists, the update is a no-op.
 */
export const logNABHEvidence = async (
  hospitalId: string,
  criterionNumber: string,
  evidenceText: string
) => {
  try {
    await supabase
      .from("nabh_criteria")
      .update({
        evidence_notes: evidenceText,
        last_assessed: new Date().toISOString().split("T")[0],
        compliance_status: "compliant",
        auto_collected: true,
      })
      .eq("hospital_id", hospitalId)
      .eq("criterion_number", criterionNumber);
  } catch (e) {
    console.error("NABH evidence logging failed:", e);
  }
};
