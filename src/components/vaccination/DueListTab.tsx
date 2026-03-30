import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Bell } from "lucide-react";

interface Props { hospitalId: string; }

const DueListTab: React.FC<Props> = ({ hospitalId }) => {
  const [filter, setFilter] = useState<"overdue" | "today" | "week" | "month">("overdue");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadDue(); }, [filter]);

  const loadDue = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    let q = supabase.from("vaccination_due")
      .select("*, patients(full_name, uhid, phone, date_of_birth), vaccine_master(vaccine_name, vaccine_code)")
      .eq("hospital_id", hospitalId);

    if (filter === "overdue") {
      q = q.eq("status", "overdue");
    } else if (filter === "today") {
      q = q.eq("due_date", today).eq("status", "due");
    } else if (filter === "week") {
      const week = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      q = q.lte("due_date", week).in("status", ["due", "overdue"]);
    } else {
      const month = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      q = q.lte("due_date", month).in("status", ["due", "overdue"]);
    }

    const { data, error } = await q.order("due_date").limit(200);
    if (error) { console.error(error); toast.error("Failed to load due list"); }
    setItems(data || []);
    setLoading(false);
  };

  const getDaysOverdue = (dueDate: string) => {
    const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  const getAge = (dob: string | null) => {
    if (!dob) return "—";
    const months = Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 86400000));
    if (months < 24) return `${months} mo`;
    return `${Math.floor(months / 12)} yr`;
  };

  const sendReminder = (item: any) => {
    const p = item.patients;
    const v = item.vaccine_master;
    const phone = p?.phone?.replace(/\D/g, "") || "";
    const msg = encodeURIComponent(
      `Dear parent/guardian, your child ${p?.full_name} is due for ${v?.vaccine_name} vaccination. Please visit at your earliest convenience. Overdue by: ${getDaysOverdue(item.due_date)} days.`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  };

  const filters = [
    { key: "overdue", label: "Overdue" },
    { key: "today", label: "Due Today" },
    { key: "week", label: "Due This Week" },
    { key: "month", label: "Due This Month" },
  ] as const;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => toast.info("Bulk reminders — WhatsApp integration needed")}>
          <Bell className="h-4 w-4 mr-1" /> Send Reminders to All Overdue
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[calc(100vh-340px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Vaccine</TableHead>
              <TableHead>Dose</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-sm">{item.patients?.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.patients?.uhid}</p>
                </TableCell>
                <TableCell className="text-sm">{getAge(item.patients?.date_of_birth)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{item.vaccine_master?.vaccine_code}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{item.dose_number}</TableCell>
                <TableCell className="text-sm">{new Date(item.due_date).toLocaleDateString("en-IN")}</TableCell>
                <TableCell>
                  {getDaysOverdue(item.due_date) > 0 ? (
                    <Badge variant="destructive" className="text-xs">{getDaysOverdue(item.due_date)}d</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => sendReminder(item)} title="Send WhatsApp reminder">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DueListTab;
