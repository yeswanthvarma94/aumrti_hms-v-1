import { supabase } from "@/integrations/supabase/client";

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  narration?: string;
}

export async function postJournalEntry(
  hospitalId: string,
  narration: string,
  lines: JournalLine[],
  sourceModule: string,
  sourceRefId?: string,
  userId?: string
) {
  // Get next entry number
  const { data: numData } = await (supabase as any).rpc("get_next_journal_number", { p_hospital_id: hospitalId });
  const entryNumber = numData || `JE-${Date.now()}`;

  // Resolve account IDs from codes
  const codes = lines.map((l) => l.accountCode);
  const { data: accounts } = await (supabase as any)
    .from("chart_of_accounts")
    .select("id, code")
    .eq("hospital_id", hospitalId)
    .in("code", codes);

  if (!accounts || accounts.length === 0) {
    console.warn("No matching accounts found for codes:", codes);
    return null;
  }

  const codeToId: Record<string, string> = {};
  accounts.forEach((a: any) => { codeToId[a.code] = a.id; });

  // Create journal entry
  const { data: entry, error: entryErr } = await (supabase as any)
    .from("journal_entries")
    .insert({
      hospital_id: hospitalId,
      entry_number: entryNumber,
      narration,
      source_module: sourceModule,
      source_ref_id: sourceRefId || null,
      is_auto: sourceModule !== "manual",
      created_by: userId || null,
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    console.error("Failed to create journal entry:", entryErr);
    return null;
  }

  // Create lines
  const lineRows = lines
    .filter((l) => codeToId[l.accountCode])
    .map((l) => ({
      journal_entry_id: entry.id,
      account_id: codeToId[l.accountCode],
      debit: l.debit || 0,
      credit: l.credit || 0,
      narration: l.narration || null,
    }));

  if (lineRows.length > 0) {
    await (supabase as any).from("journal_entry_lines").insert(lineRows);
  }

  return entry.id;
}

// Standard hospital chart of accounts codes
export const ACCOUNT_CODES = {
  // Assets
  CASH: "1001",
  BANK: "1002",
  ACCOUNTS_RECEIVABLE: "1003",
  PHARMACY_STOCK: "1100",
  INVENTORY_STOCK: "1101",
  
  // Liabilities
  ACCOUNTS_PAYABLE: "2001",
  PF_PAYABLE: "2100",
  ESIC_PAYABLE: "2101",
  GST_PAYABLE: "2200",
  TDS_PAYABLE: "2201",
  
  // Revenue
  OPD_REVENUE: "4001",
  IPD_REVENUE: "4002",
  LAB_REVENUE: "4003",
  RADIOLOGY_REVENUE: "4004",
  PHARMACY_REVENUE: "4005",
  OT_REVENUE: "4006",
  OTHER_REVENUE: "4099",
  
  // Expenses
  SALARY_EXPENSE: "5001",
  PF_EXPENSE: "5002",
  ESIC_EXPENSE: "5003",
  RENT_EXPENSE: "5100",
  ELECTRICITY_EXPENSE: "5101",
  MAINTENANCE_EXPENSE: "5102",
  COGS_PHARMACY: "5200",
  COGS_INVENTORY: "5201",
  MISC_EXPENSE: "5999",
  
  // Equity
  CAPITAL: "3001",
  RETAINED_EARNINGS: "3002",
} as const;

export const SEED_ACCOUNTS = [
  // Assets
  { code: "1001", name: "Cash", account_type: "asset" },
  { code: "1002", name: "Bank Account", account_type: "asset" },
  { code: "1003", name: "Accounts Receivable", account_type: "asset" },
  { code: "1100", name: "Pharmacy Stock", account_type: "asset" },
  { code: "1101", name: "Inventory / Stores Stock", account_type: "asset" },
  // Liabilities
  { code: "2001", name: "Accounts Payable", account_type: "liability" },
  { code: "2100", name: "PF Payable", account_type: "liability" },
  { code: "2101", name: "ESIC Payable", account_type: "liability" },
  { code: "2200", name: "GST Payable", account_type: "liability" },
  { code: "2201", name: "TDS Payable", account_type: "liability" },
  // Equity
  { code: "3001", name: "Capital", account_type: "equity" },
  { code: "3002", name: "Retained Earnings", account_type: "equity" },
  // Revenue
  { code: "4001", name: "OPD Consultation Revenue", account_type: "revenue" },
  { code: "4002", name: "IPD Revenue", account_type: "revenue" },
  { code: "4003", name: "Lab Revenue", account_type: "revenue" },
  { code: "4004", name: "Radiology Revenue", account_type: "revenue" },
  { code: "4005", name: "Pharmacy Sales Revenue", account_type: "revenue" },
  { code: "4006", name: "OT Revenue", account_type: "revenue" },
  { code: "4099", name: "Other Revenue", account_type: "revenue" },
  // Expenses
  { code: "5001", name: "Salary & Wages", account_type: "expense" },
  { code: "5002", name: "PF Contribution (Employer)", account_type: "expense" },
  { code: "5003", name: "ESIC Contribution (Employer)", account_type: "expense" },
  { code: "5100", name: "Rent Expense", account_type: "expense" },
  { code: "5101", name: "Electricity Expense", account_type: "expense" },
  { code: "5102", name: "Maintenance & Repairs", account_type: "expense" },
  { code: "5200", name: "Cost of Goods - Pharmacy", account_type: "expense" },
  { code: "5201", name: "Cost of Goods - Inventory", account_type: "expense" },
  { code: "5999", name: "Miscellaneous Expense", account_type: "expense" },
];
