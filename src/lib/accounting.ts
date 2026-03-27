import { supabase } from "@/integrations/supabase/client";

interface PostingData {
  triggerEvent: string;
  sourceModule: string;
  sourceId: string;
  amount: number;
  description: string;
  entryDate?: string;
  costCentreId?: string;
  hospitalId: string;
  postedBy: string;
}

export const autoPostJournalEntry = async (data: PostingData) => {
  try {
    // 1. Find matching rule
    const { data: rule } = await (supabase as any)
      .from("auto_posting_rules")
      .select("*, debit_account:chart_of_accounts!auto_posting_rules_debit_account_id_fkey(id, code, name), credit_account:chart_of_accounts!auto_posting_rules_credit_account_id_fkey(id, code, name)")
      .eq("hospital_id", data.hospitalId)
      .eq("trigger_event", data.triggerEvent)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!rule) return null; // No rule configured — skip silently

    // 2. Generate entry number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", data.hospitalId);

    const entryNumber = `JE-${year}-${String((count || 0) + 1).padStart(4, "0")}`;

    // 3. Create journal entry
    const { data: entry, error } = await supabase
      .from("journal_entries")
      .insert({
        hospital_id: data.hospitalId,
        entry_number: entryNumber,
        entry_date: data.entryDate || new Date().toISOString().split("T")[0],
        description: data.description,
        entry_type: `auto_${data.sourceModule}` as any,
        source_module: data.sourceModule,
        source_id: data.sourceId,
        total_debit: data.amount,
        total_credit: data.amount,
        is_balanced: true,
        posted_by: data.postedBy,
      })
      .select()
      .single();

    if (error || !entry) {
      console.error("Journal entry creation failed:", error);
      return null;
    }

    // 4. Create debit + credit line items
    await supabase.from("journal_line_items").insert([
      {
        hospital_id: data.hospitalId,
        journal_id: entry.id,
        account_id: rule.debit_account_id,
        account_code: rule.debit_account?.code || "",
        account_name: rule.debit_account?.name || "",
        debit_amount: data.amount,
        credit_amount: 0,
        description: data.description,
        cost_centre_id: data.costCentreId || null,
      },
      {
        hospital_id: data.hospitalId,
        journal_id: entry.id,
        account_id: rule.credit_account_id,
        account_code: rule.credit_account?.code || "",
        account_name: rule.credit_account?.name || "",
        debit_amount: 0,
        credit_amount: data.amount,
        description: data.description,
        cost_centre_id: data.costCentreId || null,
      },
    ]);

    return entry;
  } catch (err) {
    console.error("Auto-posting failed:", err);
    return null;
  }
};
