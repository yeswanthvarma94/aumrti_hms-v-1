import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hospitalId: string | null;
}

const BankTab: React.FC<Props> = ({ hospitalId }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadBankAccounts();
  }, [hospitalId]);

  const loadBankAccounts = async () => {
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("hospital_id", hospitalId!)
      .eq("is_active", true);
    setAccounts(data || []);
  };

  const loadTransactions = async (bankId: string) => {
    setSelectedBank(accounts.find((a) => a.id === bankId));
    const { data } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("bank_account_id", bankId)
      .order("transaction_date", { ascending: false })
      .limit(50);
    setTransactions(data || []);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-5 space-y-4">
      {/* Bank Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <Card className="border-dashed border-2 border-border col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Landmark size={32} className="text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No bank accounts configured</p>
              <p className="text-xs text-muted-foreground">Add bank accounts in Settings to enable reconciliation</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((a) => (
            <Card
              key={a.id}
              className={`cursor-pointer transition-colors ${selectedBank?.id === a.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
              onClick={() => loadTransactions(a.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark size={16} className="text-primary" />
                  <p className="text-sm font-bold text-foreground">{a.account_name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{a.bank_name} — {a.account_number}</p>
                <p className="text-lg font-bold text-foreground mt-2">{fmt(a.opening_balance)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Bank Transactions */}
      {selectedBank && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Transactions — {selectedBank.account_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                  <TableHead className="text-xs text-center">Reconciled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transactions</TableCell></TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{t.transaction_date}</TableCell>
                      <TableCell className="text-xs">{t.description}</TableCell>
                      <TableCell className="text-xs text-right">{Number(t.debit_amount) > 0 ? fmt(t.debit_amount) : ""}</TableCell>
                      <TableCell className="text-xs text-right">{Number(t.credit_amount) > 0 ? fmt(t.credit_amount) : ""}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{t.balance != null ? fmt(t.balance) : "—"}</TableCell>
                      <TableCell className="text-center">
                        {t.is_reconciled ? <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700">✓</Badge> : <span className="text-muted-foreground text-[10px]">—</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankTab;
