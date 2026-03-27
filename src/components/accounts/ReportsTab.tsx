import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, FileSpreadsheet, FileText, Bot, CheckCircle2, XCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { callAI } from "@/lib/aiProvider";

interface Props {
  hospitalId: string | null;
  dateRange: { start: string; end: string };
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  account_subtype: string | null;
  is_control: boolean;
  is_system: boolean;
  opening_balance: number | null;
}

interface LineItem {
  account_id: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
}

interface JournalLineDetail {
  id: string;
  account_code: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  entry_type: string;
  source_module: string;
}

// ─── P&L account code → label mapping (ordered) ───
const PNL_REVENUE = [
  { code: "4001", label: "OPD Consultation Revenue" },
  { code: "4002", label: "IPD Room & Nursing" },
  { code: "4003", label: "Surgical / OT Revenue" },
  { code: "4004", label: "Laboratory Revenue" },
  { code: "4005", label: "Radiology Revenue" },
  { code: "4006", label: "Pharmacy Revenue - IP" },
  { code: "4007", label: "Pharmacy Revenue - Retail" },
  { code: "4008", label: "Procedure Revenue" },
  { code: "4010", label: "Insurance / TPA Revenue" },
  { code: "4011", label: "PMJAY / CGHS Revenue" },
];

const PNL_OTHER_INCOME = [{ code: "4020", label: "Other Income" }];

const PNL_COS = [
  { code: "5010", label: "Pharmacy Purchase - Drugs" },
  { code: "5011", label: "Medical Consumables" },
  { code: "5012", label: "Surgical Items" },
];

const PNL_PERSONNEL = [
  { code: "5001", label: "Salaries - Doctors" },
  { code: "5002", label: "Salaries - Nurses" },
  { code: "5003", label: "Salaries - Administrative" },
  { code: "5004", label: "Salaries - Support Staff" },
  { code: "5005", label: "PF Employer Contribution" },
  { code: "5006", label: "ESIC Employer Contribution" },
];

const PNL_INFRA = [
  { code: "5020", label: "Rent" },
  { code: "5021", label: "Electricity & Power" },
  { code: "5022", label: "Water Charges" },
  { code: "5023", label: "Telephone & Internet" },
];

const PNL_MAINT = [
  { code: "5030", label: "Equipment Maintenance" },
  { code: "5031", label: "Building Maintenance" },
  { code: "5032", label: "Housekeeping Expenses" },
];

const PNL_ADMIN = [
  { code: "5040", label: "Professional Fees" },
  { code: "5041", label: "Marketing & Advertising" },
  { code: "5042", label: "Printing & Stationery" },
  { code: "5043", label: "Bank Charges" },
  { code: "5044", label: "Insurance Premium" },
  { code: "5060", label: "Miscellaneous" },
];

const PNL_NONCASH = [{ code: "5050", label: "Depreciation" }];

// ─── Balance Sheet structure ───
const BS_CURRENT_ASSETS = [
  { code: "1001", label: "Cash in Hand" },
  { code: "1002", label: "Cash in Bank" },
  { code: "1003", label: "Bank - Savings" },
  { code: "1010", label: "Accounts Receivable" },
  { code: "1011", label: "Insurance Receivable" },
  { code: "1012", label: "PMJAY Receivable" },
  { code: "1020", label: "Pharmacy Stock" },
  { code: "1021", label: "Medical Consumables Stock" },
  { code: "1030", label: "Prepaid Expenses" },
  { code: "1031", label: "GST Input Tax Credit" },
];

const BS_FIXED_ASSETS = [
  { code: "1100", label: "Medical Equipment" },
  { code: "1101", label: "Furniture & Fixtures" },
  { code: "1102", label: "Computers & IT" },
  { code: "1103", label: "Vehicles" },
  { code: "1104", label: "Building Improvements" },
  { code: "1110", label: "Less: Accumulated Depreciation", negate: true },
];

const BS_CURRENT_LIABILITIES = [
  { code: "2001", label: "Accounts Payable - Vendors" },
  { code: "2002", label: "Accounts Payable - Drugs" },
  { code: "2010", label: "Salaries Payable" },
  { code: "2011", label: "PF Payable" },
  { code: "2012", label: "ESIC Payable" },
  { code: "2013", label: "TDS Payable" },
  { code: "2020", label: "GST Payable" },
  { code: "2030", label: "Advance from Patients" },
];

const BS_LT_LIABILITIES = [
  { code: "2100", label: "Bank Loan" },
  { code: "2101", label: "Equipment Finance" },
];

const BS_EQUITY = [
  { code: "3001", label: "Capital Account" },
  { code: "3002", label: "Retained Earnings" },
];

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const pct = (num: number, den: number) => den === 0 ? "0.0" : ((num / den) * 100).toFixed(1);

const ReportsTab: React.FC<Props> = ({ hospitalId, dateRange }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Account Statement state
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [acctEntries, setAcctEntries] = useState<(JournalLineDetail & { entry: JournalEntry })[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadData();
  }, [hospitalId, dateRange]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: accts }, { data: items }] = await Promise.all([
      (supabase as any).from("chart_of_accounts").select("*").eq("hospital_id", hospitalId!).eq("is_active", true).order("code"),
      supabase.from("journal_line_items").select("account_id, account_code, debit_amount, credit_amount").eq("hospital_id", hospitalId!)
        .gte("created_at", dateRange.start).lte("created_at", dateRange.end + "T23:59:59"),
    ]);
    setAccounts(accts || []);
    setLineItems(items || []);
    setLoading(false);
  };

  // ─── Balance helpers ───
  const balanceByCode = useMemo(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    for (const li of lineItems) {
      if (!map[li.account_code]) map[li.account_code] = { debit: 0, credit: 0 };
      map[li.account_code].debit += Number(li.debit_amount || 0);
      map[li.account_code].credit += Number(li.credit_amount || 0);
    }
    return map;
  }, [lineItems]);

  const balanceById = useMemo(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    for (const li of lineItems) {
      if (!map[li.account_id]) map[li.account_id] = { debit: 0, credit: 0 };
      map[li.account_id].debit += Number(li.debit_amount || 0);
      map[li.account_id].credit += Number(li.credit_amount || 0);
    }
    return map;
  }, [lineItems]);

  // Revenue = credit - debit (credit-normal)
  const revenueBalance = (code: string) => {
    const b = balanceByCode[code];
    return b ? b.credit - b.debit : 0;
  };

  // Expense = debit - credit (debit-normal)
  const expenseBalance = (code: string) => {
    const b = balanceByCode[code];
    return b ? b.debit - b.credit : 0;
  };

  // Asset = debit - credit (debit-normal)
  const assetBalance = (code: string) => {
    const b = balanceByCode[code];
    return b ? b.debit - b.credit : 0;
  };

  // Liability/Equity = credit - debit (credit-normal)
  const liabilityBalance = (code: string) => {
    const b = balanceByCode[code];
    return b ? b.credit - b.debit : 0;
  };

  const sumGroup = (items: { code: string }[], fn: (code: string) => number) =>
    items.reduce((s, i) => s + fn(i.code), 0);

  // ─── P&L calculations ───
  const totalRevOps = sumGroup(PNL_REVENUE, revenueBalance);
  const totalOtherIncome = sumGroup(PNL_OTHER_INCOME, revenueBalance);
  const totalIncome = totalRevOps + totalOtherIncome;
  const totalCOS = sumGroup(PNL_COS, expenseBalance);
  const grossProfit = totalIncome - totalCOS;
  const totalPersonnel = sumGroup(PNL_PERSONNEL, expenseBalance);
  const totalInfra = sumGroup(PNL_INFRA, expenseBalance);
  const totalMaint = sumGroup(PNL_MAINT, expenseBalance);
  const totalAdmin = sumGroup(PNL_ADMIN, expenseBalance);
  const totalNonCash = sumGroup(PNL_NONCASH, expenseBalance);
  const totalExpenses = totalCOS + totalPersonnel + totalInfra + totalMaint + totalAdmin + totalNonCash;
  const netProfit = totalIncome - totalExpenses;

  // ─── Balance Sheet calculations ───
  const totalCurrentAssets = sumGroup(BS_CURRENT_ASSETS, assetBalance);
  const totalFixedAssets = BS_FIXED_ASSETS.reduce((s, i) => {
    const bal = assetBalance(i.code);
    return s + ((i as any).negate ? -Math.abs(bal) : bal);
  }, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiab = sumGroup(BS_CURRENT_LIABILITIES, liabilityBalance);
  const totalLTLiab = sumGroup(BS_LT_LIABILITIES, liabilityBalance);
  const totalEquityAccounts = sumGroup(BS_EQUITY, liabilityBalance);
  const totalEquity = totalEquityAccounts + netProfit; // Current year P&L flows into equity
  const totalLiabEquity = totalCurrentLiab + totalLTLiab + totalEquity;
  const balanceDiff = Math.abs(totalAssets - totalLiabEquity);

  // ─── Account Statement ───
  const loadAccountStatement = useCallback(async (accountId: string) => {
    if (!hospitalId || !accountId) return;
    setSelectedAccountId(accountId);
    const { data } = await supabase
      .from("journal_line_items")
      .select("id, account_code, account_id, debit_amount, credit_amount, created_at, journal_entry_id")
      .eq("hospital_id", hospitalId)
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) { setAcctEntries([]); return; }

    const entryIds = [...new Set(data.map((d: any) => d.journal_entry_id))];
    const { data: entries } = await (supabase as any)
      .from("journal_entries")
      .select("id, entry_number, entry_date, description, entry_type, source_module")
      .in("id", entryIds);

    const entryMap: Record<string, JournalEntry> = {};
    (entries || []).forEach((e: JournalEntry) => { entryMap[e.id] = e; });

    setAcctEntries(data.map((d: any) => ({ ...d, entry: entryMap[d.journal_entry_id] || { id: "", entry_number: "—", entry_date: "", description: "", entry_type: "", source_module: "" } })));
  }, [hospitalId]);

  // ─── AI Analysis ───
  const runAIAnalysis = async () => {
    if (!hospitalId) return;
    setAiLoading(true);
    try {
      const prompt = `Hospital P&L for ${dateRange.start} to ${dateRange.end}:
Revenue: ${fmt(totalIncome)}
Cost of Services: ${fmt(totalCOS)}
Gross Profit: ${fmt(grossProfit)} (${pct(grossProfit, totalIncome)}% margin)
Total Expenses: ${fmt(totalExpenses)}
Net Profit: ${fmt(netProfit)} (${pct(netProfit, totalIncome)}% margin)
Personnel Costs: ${fmt(totalPersonnel)}
Infrastructure: ${fmt(totalInfra)}

Write a 5-point CFO-level financial analysis:
1. Profitability assessment
2. Revenue trend analysis
3. Expense efficiency commentary
4. Working capital observation
5. One specific recommendation`;

      const res = await callAI({ featureKey: "financial_analysis", prompt, hospitalId, maxTokens: 800, systemPrompt: "You are a hospital CFO advisor. Provide concise, actionable analysis." });
      setAiAnalysis(res.text || "Analysis unavailable.");
    } catch {
      setAiAnalysis("AI analysis failed. Check AI provider configuration.");
    }
    setAiLoading(false);
  };

  // ─── Render helpers ───
  const SectionRow = ({ label, className }: { label: string; className?: string }) => (
    <TableRow className={className}><TableCell colSpan={2} className="text-xs font-bold py-2">{label}</TableCell></TableRow>
  );

  const AmountRow = ({ label, amount, indent = false }: { label: string; amount: number; indent?: boolean }) => (
    amount !== 0 ? (
      <TableRow>
        <TableCell className={`text-xs py-1.5 ${indent ? "pl-8" : "pl-4"}`}>{label}</TableCell>
        <TableCell className="text-xs text-right py-1.5 font-mono">{fmt(amount)}</TableCell>
      </TableRow>
    ) : null
  );

  const SubtotalRow = ({ label, amount, color }: { label: string; amount: number; color?: string }) => (
    <TableRow className="border-t border-border">
      <TableCell className="text-xs font-semibold py-2 pl-4">{label}</TableCell>
      <TableCell className={`text-xs text-right font-bold py-2 font-mono ${color || ""}`}>{fmt(amount)}</TableCell>
    </TableRow>
  );

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-5 space-y-4">
      <Tabs defaultValue="pnl">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="pnl" className="text-xs">P&L Statement</TabsTrigger>
          <TabsTrigger value="bs" className="text-xs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="tb" className="text-xs">Trial Balance</TabsTrigger>
          <TabsTrigger value="acct" className="text-xs">Account Statement</TabsTrigger>
          <TabsTrigger value="gst" className="text-xs">GST Summary</TabsTrigger>
        </TabsList>

        {/* ═══ P&L STATEMENT ═══ */}
        <TabsContent value="pnl">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Profit & Loss Statement</CardTitle>
                <p className="text-xs text-muted-foreground">{dateRange.start} to {dateRange.end}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.print()}><Printer className="h-3 w-3 mr-1" />Print</Button>
                <Button size="sm" variant="outline" className="text-xs h-7"><FileText className="h-3 w-3 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" className="text-xs h-7"><FileSpreadsheet className="h-3 w-3 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="text-xs">Particulars</TableHead><TableHead className="text-xs text-right w-40">Amount (₹)</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {/* REVENUE */}
                  <SectionRow label="REVENUE FROM OPERATIONS" className="bg-emerald-50/50 dark:bg-emerald-950/10" />
                  {PNL_REVENUE.map(r => <AmountRow key={r.code} label={r.label} amount={revenueBalance(r.code)} indent />)}
                  <SubtotalRow label="Total Revenue from Operations" amount={totalRevOps} color="text-emerald-700 dark:text-emerald-400" />

                  <SectionRow label="OTHER INCOME" className="bg-emerald-50/30 dark:bg-emerald-950/5" />
                  {PNL_OTHER_INCOME.map(r => <AmountRow key={r.code} label={r.label} amount={revenueBalance(r.code)} indent />)}
                  <SubtotalRow label="TOTAL INCOME" amount={totalIncome} color="text-emerald-700 dark:text-emerald-400" />

                  {/* COST OF SERVICES */}
                  <SectionRow label="COST OF SERVICES" className="bg-red-50/50 dark:bg-red-950/10" />
                  {PNL_COS.map(r => <AmountRow key={r.code} label={r.label} amount={expenseBalance(r.code)} indent />)}
                  <SubtotalRow label="Total Cost of Services" amount={totalCOS} color="text-red-500" />

                  {/* GROSS PROFIT */}
                  <TableRow className="bg-primary/5 border-t-2 border-b-2">
                    <TableCell className="text-sm font-bold py-2">GROSS PROFIT</TableCell>
                    <TableCell className={`text-sm text-right font-bold py-2 font-mono ${grossProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>
                      {fmt(grossProfit)} <span className="text-xs font-normal text-muted-foreground ml-1">({pct(grossProfit, totalIncome)}%)</span>
                    </TableCell>
                  </TableRow>

                  {/* PERSONNEL */}
                  <SectionRow label="PERSONNEL COSTS" className="bg-muted/50" />
                  {PNL_PERSONNEL.map(r => <AmountRow key={r.code} label={r.label} amount={expenseBalance(r.code)} indent />)}
                  <SubtotalRow label="Total Personnel Costs" amount={totalPersonnel} />

                  {/* INFRASTRUCTURE */}
                  <SectionRow label="INFRASTRUCTURE COSTS" className="bg-muted/50" />
                  {PNL_INFRA.map(r => <AmountRow key={r.code} label={r.label} amount={expenseBalance(r.code)} indent />)}
                  <SubtotalRow label="Total Infrastructure" amount={totalInfra} />

                  {/* MAINTENANCE */}
                  <SectionRow label="MAINTENANCE & OPERATIONS" className="bg-muted/50" />
                  {PNL_MAINT.map(r => <AmountRow key={r.code} label={r.label} amount={expenseBalance(r.code)} indent />)}
                  <SubtotalRow label="Total Maintenance" amount={totalMaint} />

                  {/* ADMINISTRATIVE */}
                  <SectionRow label="ADMINISTRATIVE" className="bg-muted/50" />
                  {PNL_ADMIN.map(r => <AmountRow key={r.code} label={r.label} amount={expenseBalance(r.code)} indent />)}
                  <SubtotalRow label="Total Administrative" amount={totalAdmin} />

                  {/* NON-CASH */}
                  <SectionRow label="NON-CASH" className="bg-muted/50" />
                  {PNL_NONCASH.map(r => <AmountRow key={r.code} label={r.label} amount={expenseBalance(r.code)} indent />)}

                  {/* TOTAL EXPENSES */}
                  <TableRow className="border-t-2">
                    <TableCell className="text-xs font-bold py-2">TOTAL EXPENSES</TableCell>
                    <TableCell className="text-xs text-right font-bold py-2 font-mono text-red-500">{fmt(totalExpenses)}</TableCell>
                  </TableRow>

                  {/* NET PROFIT */}
                  <TableRow className="bg-primary/5 border-t-4">
                    <TableCell className="text-base font-bold py-3">NET {netProfit >= 0 ? "PROFIT" : "LOSS"}</TableCell>
                    <TableCell className={`text-base text-right font-bold py-3 font-mono ${netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>
                      {netProfit < 0 && "("}
                      {fmt(netProfit)}
                      {netProfit < 0 && ")"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground">Net Profit Margin</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground font-mono">{pct(netProfit, totalIncome)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* AI Analysis */}
              <div className="mt-4">
                <Button size="sm" variant="outline" onClick={runAIAnalysis} disabled={aiLoading} className="text-xs">
                  {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
                  AI Financial Analysis
                </Button>
                {aiAnalysis && (
                  <Card className="mt-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> AI Financial Analysis</p>
                      <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{aiAnalysis}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ BALANCE SHEET ═══ */}
        <TabsContent value="bs">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Balance Sheet</CardTitle>
                <p className="text-xs text-muted-foreground">As at {dateRange.end}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.print()}><Printer className="h-3 w-3 mr-1" />Print</Button>
                <Button size="sm" variant="outline" className="text-xs h-7"><FileSpreadsheet className="h-3 w-3 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ASSETS */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead colSpan={2} className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/10">ASSETS</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      <SectionRow label="CURRENT ASSETS" className="bg-muted/30" />
                      {BS_CURRENT_ASSETS.map(a => <AmountRow key={a.code} label={a.label} amount={assetBalance(a.code)} indent />)}
                      <SubtotalRow label="Total Current Assets" amount={totalCurrentAssets} color="text-blue-700 dark:text-blue-400" />

                      <SectionRow label="FIXED ASSETS" className="bg-muted/30" />
                      {BS_FIXED_ASSETS.map(a => {
                        const bal = assetBalance(a.code);
                        const display = (a as any).negate ? -Math.abs(bal) : bal;
                        return display !== 0 ? (
                          <TableRow key={a.code}>
                            <TableCell className="text-xs py-1.5 pl-8">{a.label}</TableCell>
                            <TableCell className="text-xs text-right py-1.5 font-mono">{(a as any).negate && bal !== 0 ? `(${fmt(bal)})` : fmt(display)}</TableCell>
                          </TableRow>
                        ) : null;
                      })}
                      <SubtotalRow label="Total Fixed Assets" amount={totalFixedAssets} />

                      <TableRow className="bg-blue-50/50 dark:bg-blue-950/10 border-t-2">
                        <TableCell className="text-sm font-bold py-2">TOTAL ASSETS</TableCell>
                        <TableCell className="text-sm text-right font-bold py-2 font-mono text-blue-700 dark:text-blue-400">{fmt(totalAssets)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* LIABILITIES & EQUITY */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead colSpan={2} className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10">LIABILITIES & EQUITY</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      <SectionRow label="CURRENT LIABILITIES" className="bg-muted/30" />
                      {BS_CURRENT_LIABILITIES.map(a => <AmountRow key={a.code} label={a.label} amount={liabilityBalance(a.code)} indent />)}
                      <SubtotalRow label="Total Current Liabilities" amount={totalCurrentLiab} />

                      <SectionRow label="LONG TERM LIABILITIES" className="bg-muted/30" />
                      {BS_LT_LIABILITIES.map(a => <AmountRow key={a.code} label={a.label} amount={liabilityBalance(a.code)} indent />)}
                      <SubtotalRow label="Total Long Term Liabilities" amount={totalLTLiab} />

                      <SectionRow label="EQUITY" className="bg-muted/30" />
                      {BS_EQUITY.map(a => <AmountRow key={a.code} label={a.label} amount={liabilityBalance(a.code)} indent />)}
                      <AmountRow label="Current Year Profit/(Loss)" amount={netProfit} indent />
                      <SubtotalRow label="Total Equity" amount={totalEquity} />

                      <TableRow className="bg-amber-50/50 dark:bg-amber-950/10 border-t-2">
                        <TableCell className="text-sm font-bold py-2">TOTAL LIABILITIES + EQUITY</TableCell>
                        <TableCell className="text-sm text-right font-bold py-2 font-mono text-amber-700 dark:text-amber-400">{fmt(totalLiabEquity)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Balance Check */}
              <div className={`mt-4 p-3 rounded-md flex items-center gap-2 text-xs font-medium ${balanceDiff < 0.01 ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"}`}>
                {balanceDiff < 0.01 ? <><CheckCircle2 className="h-4 w-4" /> Balanced — Assets equal Liabilities + Equity</> : <><XCircle className="h-4 w-4" /> Out of balance by {fmt(balanceDiff)}</>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TRIAL BALANCE ═══ */}
        <TabsContent value="tb">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trial Balance</CardTitle>
              <p className="text-xs text-muted-foreground">{dateRange.start} to {dateRange.end}</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-24">Code</TableHead>
                    <TableHead className="text-xs">Account Name</TableHead>
                    <TableHead className="text-xs w-20">Type</TableHead>
                    <TableHead className="text-xs text-right w-32">Debit (₹)</TableHead>
                    <TableHead className="text-xs text-right w-32">Credit (₹)</TableHead>
                    <TableHead className="text-xs text-right w-32">Net Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.filter(a => !a.is_control && !a.is_system).map(a => {
                    const b = balanceById[a.id];
                    if (!b) return null;
                    const net = b.debit - b.credit;
                    if (b.debit === 0 && b.credit === 0) return null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-mono">{a.code}</TableCell>
                        <TableCell className="text-xs">{a.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{a.account_type}</Badge></TableCell>
                        <TableCell className="text-xs text-right font-mono">{b.debit > 0 ? fmt(b.debit) : "—"}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{b.credit > 0 ? fmt(b.credit) : "—"}</TableCell>
                        <TableCell className={`text-xs text-right font-mono font-medium ${net > 0 ? "" : net < 0 ? "text-red-500" : ""}`}>
                          {net > 0 ? fmt(net) : net < 0 ? `(${fmt(net)})` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals */}
                  {(() => {
                    let totalDr = 0, totalCr = 0;
                    accounts.filter(a => !a.is_control && !a.is_system).forEach(a => {
                      const b = balanceById[a.id];
                      if (b) { totalDr += b.debit; totalCr += b.credit; }
                    });
                    return (
                      <TableRow className="border-t-2 bg-muted/30 font-bold">
                        <TableCell colSpan={3} className="text-xs font-bold">TOTALS</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(totalDr)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(totalCr)}</TableCell>
                        <TableCell className={`text-xs text-right font-mono ${Math.abs(totalDr - totalCr) < 0.01 ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>
                          {Math.abs(totalDr - totalCr) < 0.01 ? "✓ Balanced" : fmt(totalDr - totalCr)}
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ ACCOUNT STATEMENT ═══ */}
        <TabsContent value="acct">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Account Statement</CardTitle>
              <p className="text-xs text-muted-foreground">Select an account to view all transactions</p>
            </CardHeader>
            <CardContent>
              <Select value={selectedAccountId} onValueChange={(v) => loadAccountStatement(v)}>
                <SelectTrigger className="w-80 h-8 text-xs mb-4">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => !a.is_control && !a.is_system).map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAccount && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className="text-xs capitalize">{selectedAccount.account_type}</Badge>
                    <span className="text-xs text-muted-foreground">Opening Balance: {fmt(selectedAccount.opening_balance || 0)}</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-24">Date</TableHead>
                        <TableHead className="text-xs w-28">Entry #</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right w-28">Debit (₹)</TableHead>
                        <TableHead className="text-xs text-right w-28">Credit (₹)</TableHead>
                        <TableHead className="text-xs text-right w-32">Balance (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        let running = selectedAccount.opening_balance || 0;
                        const isDebitNormal = ["asset", "expense"].includes(selectedAccount.account_type);
                        return acctEntries.map((e) => {
                          const dr = Number(e.debit_amount || 0);
                          const cr = Number(e.credit_amount || 0);
                          running += isDebitNormal ? (dr - cr) : (cr - dr);
                          return (
                            <TableRow key={e.id}>
                              <TableCell className="text-xs font-mono">{e.entry?.entry_date || e.created_at?.split("T")[0]}</TableCell>
                              <TableCell className="text-xs font-mono">{e.entry?.entry_number || "—"}</TableCell>
                              <TableCell className="text-xs">{e.entry?.description || "—"}</TableCell>
                              <TableCell className="text-xs text-right font-mono">{dr > 0 ? fmt(dr) : "—"}</TableCell>
                              <TableCell className="text-xs text-right font-mono">{cr > 0 ? fmt(cr) : "—"}</TableCell>
                              <TableCell className={`text-xs text-right font-mono font-medium ${running >= 0 ? "" : "text-red-500"}`}>{running < 0 ? `(${fmt(running)})` : fmt(running)}</TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                      {acctEntries.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-8">No transactions found for this account</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ GST SUMMARY ═══ */}
        <TabsContent value="gst">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">GST Summary</CardTitle>
              <p className="text-xs text-muted-foreground">{dateRange.start} to {dateRange.end}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">GST Output (Collected)</p>
                    <p className="text-lg font-bold font-mono text-foreground">{fmt(liabilityBalance("2020"))}</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">GST Input (Paid)</p>
                    <p className="text-lg font-bold font-mono text-foreground">{fmt(assetBalance("1031"))}</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Net GST Payable</p>
                    {(() => {
                      const net = liabilityBalance("2020") - assetBalance("1031");
                      return <p className={`text-lg font-bold font-mono ${net > 0 ? "text-red-500" : "text-emerald-700 dark:text-emerald-400"}`}>{net > 0 ? fmt(net) : `(${fmt(net)}) Refundable`}</p>;
                    })()}
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground">Detailed GSTR-1 / GSTR-3B reports will be available once GST invoice data is populated.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsTab;
