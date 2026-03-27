import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  hospitalId: string | null;
  dateRange: { start: string; end: string };
}

const ReportsTab: React.FC<Props> = ({ hospitalId, dateRange }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadData();
  }, [hospitalId, dateRange]);

  const loadData = async () => {
    const [{ data: accts }, { data: items }] = await Promise.all([
      (supabase as any).from("chart_of_accounts").select("*").eq("hospital_id", hospitalId!).eq("is_active", true).order("code"),
      supabase.from("journal_line_items").select("account_id, account_code, debit_amount, credit_amount").eq("hospital_id", hospitalId!)
        .gte("created_at", dateRange.start).lte("created_at", dateRange.end + "T23:59:59"),
    ]);
    setAccounts(accts || []);
    setLineItems(items || []);
  };

  const getBalance = (accountId: string) => {
    return lineItems
      .filter((li) => li.account_id === accountId)
      .reduce((s, li) => s + Number(li.debit_amount || 0) - Number(li.credit_amount || 0), 0);
  };

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const grouped = (types: string[]) =>
    accounts.filter((a) => types.includes(a.account_type) && !a.is_control && !a.is_system);

  const totalByTypes = (types: string[]) =>
    grouped(types).reduce((s, a) => s + getBalance(a.id), 0);

  const totalRevenue = Math.abs(totalByTypes(["revenue"]));
  const totalExpense = totalByTypes(["expense"]);

  return (
    <div className="p-5 space-y-4">
      <Tabs defaultValue="pnl">
        <TabsList className="h-9">
          <TabsTrigger value="pnl" className="text-xs">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs" className="text-xs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="tb" className="text-xs">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Profit & Loss Statement</CardTitle>
              <p className="text-xs text-muted-foreground">{dateRange.start} to {dateRange.end}</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="text-xs">Account</TableHead><TableHead className="text-xs text-right">Amount</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/10">
                    <TableCell className="text-xs font-bold text-emerald-700" colSpan={2}>REVENUE</TableCell>
                  </TableRow>
                  {grouped(["revenue"]).map((a) => {
                    const bal = Math.abs(getBalance(a.id));
                    return bal > 0 ? (
                      <TableRow key={a.id}><TableCell className="text-xs pl-6">{a.code} — {a.name}</TableCell><TableCell className="text-xs text-right">{fmt(bal)}</TableCell></TableRow>
                    ) : null;
                  })}
                  <TableRow className="border-t-2"><TableCell className="text-xs font-bold">Total Revenue</TableCell><TableCell className="text-xs text-right font-bold text-emerald-700">{fmt(totalRevenue)}</TableCell></TableRow>

                  <TableRow className="bg-red-50/50 dark:bg-red-950/10">
                    <TableCell className="text-xs font-bold text-red-700" colSpan={2}>EXPENSES</TableCell>
                  </TableRow>
                  {grouped(["expense"]).map((a) => {
                    const bal = getBalance(a.id);
                    return bal > 0 ? (
                      <TableRow key={a.id}><TableCell className="text-xs pl-6">{a.code} — {a.name}</TableCell><TableCell className="text-xs text-right">{fmt(bal)}</TableCell></TableRow>
                    ) : null;
                  })}
                  <TableRow className="border-t-2"><TableCell className="text-xs font-bold">Total Expenses</TableCell><TableCell className="text-xs text-right font-bold text-red-500">{fmt(totalExpense)}</TableCell></TableRow>

                  <TableRow className="bg-primary/5 border-t-4">
                    <TableCell className="text-sm font-bold">Net {totalRevenue - totalExpense >= 0 ? "Profit" : "Loss"}</TableCell>
                    <TableCell className={`text-sm text-right font-bold ${totalRevenue - totalExpense >= 0 ? "text-emerald-700" : "text-red-500"}`}>
                      {fmt(totalRevenue - totalExpense)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Balance Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-2">ASSETS</p>
                  {grouped(["asset"]).map((a) => {
                    const bal = getBalance(a.id);
                    return bal !== 0 ? <div key={a.id} className="flex justify-between text-xs py-1"><span>{a.name}</span><span>{fmt(bal)}</span></div> : null;
                  })}
                  <div className="flex justify-between text-xs font-bold border-t border-border pt-1 mt-2">
                    <span>Total Assets</span><span>{fmt(totalByTypes(["asset"]))}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-2">LIABILITIES & EQUITY</p>
                  {grouped(["liability", "equity"]).map((a) => {
                    const bal = Math.abs(getBalance(a.id));
                    return bal !== 0 ? <div key={a.id} className="flex justify-between text-xs py-1"><span>{a.name}</span><span>{fmt(bal)}</span></div> : null;
                  })}
                  <div className="flex justify-between text-xs font-bold border-t border-border pt-1 mt-2">
                    <span>Total Liabilities + Equity</span><span>{fmt(Math.abs(totalByTypes(["liability", "equity"])))}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tb">
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trial Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.filter((a) => !a.is_control && !a.is_system).map((a) => {
                    const bal = getBalance(a.id);
                    if (bal === 0) return null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-mono">{a.code}</TableCell>
                        <TableCell className="text-xs">{a.name}</TableCell>
                        <TableCell className="text-xs text-right">{bal > 0 ? fmt(bal) : ""}</TableCell>
                        <TableCell className="text-xs text-right">{bal < 0 ? fmt(bal) : ""}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsTab;
