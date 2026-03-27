import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  hospitalId: string | null;
  dateRange: { start: string; end: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  salary: "Salary", rent: "Rent", electricity: "Electricity", water: "Water",
  telephone: "Telephone", internet: "Internet", fuel: "Fuel", vehicle: "Vehicle",
  maintenance: "Maintenance", repair: "Repair", housekeeping: "Housekeeping",
  laundry: "Laundry", catering: "Catering", insurance: "Insurance",
  professional_fees: "Professional Fees", marketing: "Marketing",
  printing: "Printing", stationery: "Stationery", bank_charges: "Bank Charges",
  depreciation: "Depreciation", miscellaneous: "Miscellaneous", other: "Other",
};

const ExpensesTab: React.FC<Props> = ({ hospitalId, dateRange }) => {
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadExpenses();
  }, [hospitalId, dateRange]);

  const loadExpenses = async () => {
    const { data } = await supabase
      .from("expense_records")
      .select("*")
      .eq("hospital_id", hospitalId!)
      .gte("expense_date", dateRange.start)
      .lte("expense_date", dateRange.end)
      .order("expense_date", { ascending: false });
    setExpenses(data || []);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
  const total = expenses.reduce((s, e) => s + Number(e.total_amount || 0), 0);

  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{expenses.length} expenses recorded</p>
        <p className="text-sm font-bold text-foreground">Total: {fmt(total)}</p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Vendor</TableHead>
              <TableHead className="text-xs">Payment</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs text-right">GST</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No expenses recorded in this period</TableCell></TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.expense_date}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[e.expense_category] || e.expense_category}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{e.description}</TableCell>
                  <TableCell className="text-xs">{e.vendor_name || "—"}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{e.payment_mode?.replace("_", " ")}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(e.amount)}</TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">{fmt(e.gst_amount || 0)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{fmt(e.total_amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExpensesTab;
