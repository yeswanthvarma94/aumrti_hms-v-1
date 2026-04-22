import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalId } from "@/hooks/useHospitalId";
import { generateBillNumber } from "@/hooks/useBillNumber";
import { logAudit } from "@/lib/auditLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, Download, Wrench, RefreshCw } from "lucide-react";

interface BillRow {
  id: string;
  bill_number: string;
  bill_type: string | null;
  bill_date: string | null;
  created_at: string;
}

interface DuplicateGroup {
  bill_number: string;
  count: number;
  bills: BillRow[];
}

// Map bill_type → bill number prefix used by generateBillNumber
const PREFIX_MAP: Record<string, string> = {
  opd: "OPD",
  ipd: "BILL",
  emergency: "BILL",
  daycare: "BILL",
  pharmacy: "PHARM",
  retail_pharmacy: "RET",
  package: "PKG",
  package_excess: "PKG",
  dialysis: "DIAL",
  physio: "PHYS",
  dental: "DENT",
  ayush: "AYSH",
  vaccination: "VACC",
  blood_bank: "BLOOD",
  oncology: "CHEMO",
  ivf: "IVF",
  telemedicine: "TELE",
  nursing: "NURS",
  lab: "LAB",
  radiology: "RAD",
};

const prefixForBillType = (billType: string | null | undefined): string => {
  if (!billType) return "BILL";
  return PREFIX_MAP[billType] || "BILL";
};

const BillNumberAuditPage: React.FC = () => {
  const { hospitalId, role, loading: hospitalLoading } = useHospitalId();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  // Resolve internal admin user id for audit logging
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Failed to resolve admin user:", error.message);
        return;
      }
      if (data?.id) setAdminUserId(data.id);
    })();
  }, []);

  const loadDuplicates = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      // Fetch all bills for this hospital (id, number, type, date, created_at)
      // and group client-side. This avoids needing a custom RPC and stays
      // within select-only access.
      const { data, error } = await supabase
        .from("bills")
        .select("id, bill_number, bill_type, bill_date, created_at")
        .eq("hospital_id", hospitalId)
        .order("bill_number", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load bills:", error.message);
        toast({ title: "Failed to load bills", description: error.message, variant: "destructive" });
        setGroups([]);
        return;
      }

      const byNumber = new Map<string, BillRow[]>();
      (data || []).forEach((b: any) => {
        const key = b.bill_number || "(null)";
        if (!byNumber.has(key)) byNumber.set(key, []);
        byNumber.get(key)!.push(b as BillRow);
      });

      const dupes: DuplicateGroup[] = [];
      byNumber.forEach((bills, bill_number) => {
        if (bills.length > 1) {
          dupes.push({ bill_number, count: bills.length, bills });
        }
      });

      // Sort by count desc, then bill_number asc
      dupes.sort((a, b) => b.count - a.count || a.bill_number.localeCompare(b.bill_number));

      setGroups(dupes);
    } catch (err: any) {
      console.error("Audit load failed:", err);
      toast({ title: "Audit failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [hospitalId, toast]);

  useEffect(() => {
    if (hospitalId) loadDuplicates();
  }, [hospitalId, loadDuplicates]);

  const fixGroup = async (group: DuplicateGroup) => {
    if (!hospitalId) return;
    setFixingKey(group.bill_number);
    try {
      // Sort by created_at ASC — keep the oldest, renumber the rest.
      const sorted = [...group.bills].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const [keep, ...toRenumber] = sorted;

      let renamedCount = 0;
      const failures: string[] = [];

      for (const bill of toRenumber) {
        try {
          const prefix = prefixForBillType(bill.bill_type);
          const newNumber = await generateBillNumber(hospitalId, prefix);

          const { error: updateErr } = await supabase
            .from("bills")
            .update({ bill_number: newNumber })
            .eq("id", bill.id);

          if (updateErr) {
            console.error(`Failed to rename bill ${bill.id}:`, updateErr.message);
            failures.push(bill.id);
            continue;
          }

          await logAudit({
            action: "bill_number_dedup",
            module: "billing",
            entityType: "bill",
            entityId: bill.id,
            details: {
              old_number: group.bill_number,
              new_number: newNumber,
              bill_id: bill.id,
              bill_type: bill.bill_type,
              fixed_by: adminUserId,
              kept_id: keep.id,
            },
          });

          renamedCount += 1;
        } catch (perBillErr: any) {
          console.error(`Renumber failed for bill ${bill.id}:`, perBillErr);
          failures.push(bill.id);
        }
      }

      if (failures.length === 0) {
        toast({
          title: `Fixed ${group.bill_number}`,
          description: `Kept oldest, renumbered ${renamedCount} duplicate${renamedCount === 1 ? "" : "s"}.`,
        });
      } else {
        toast({
          title: `Partially fixed ${group.bill_number}`,
          description: `Renumbered ${renamedCount}, ${failures.length} failed. Check console.`,
          variant: "destructive",
        });
      }

      await loadDuplicates();
    } catch (err: any) {
      console.error("Fix group failed:", err);
      toast({ title: "Fix failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setFixingKey(null);
    }
  };

  const downloadCSV = () => {
    if (groups.length === 0) {
      toast({ title: "No duplicates to export" });
      return;
    }
    const header = ["bill_number", "duplicate_count", "bill_id", "bill_type", "bill_date", "created_at"];
    const rows: string[][] = [];
    groups.forEach(g => {
      g.bills.forEach(b => {
        rows.push([
          g.bill_number,
          String(g.count),
          b.id,
          b.bill_type || "",
          b.bill_date || "",
          b.created_at,
        ]);
      });
    });
    const csv = [header, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `bill-number-duplicates-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Role gate — RoleGuard at route level should already have stopped non-admins,
  // but we double-check here for defence in depth (as per spec rule 8).
  if (hospitalLoading) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = role === "admin" || role === "super_admin" || role === "hospital_admin";
  if (!isAdmin) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center p-6">
        <div className="text-center space-y-2 max-w-sm">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-foreground">Admin access required</p>
          <p className="text-xs text-muted-foreground">
            This diagnostic is restricted to administrators.
          </p>
        </div>
      </div>
    );
  }

  const totalDupes = groups.reduce((s, g) => s + g.count - 1, 0);

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-muted/20">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Bill Number Deduplication</h1>
            <p className="text-xs text-muted-foreground mt-1">
              One-time data integrity audit. Detects duplicate <code className="font-mono">bill_number</code> values
              within this hospital and renumbers conflicts using the atomic generator.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadDuplicates} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Re-run audit
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV} disabled={groups.length === 0} className="gap-2">
              <Download className="w-3.5 h-3.5" />
              Download Report
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Scanning bills…</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              ✓ All Bill Numbers Are Unique
            </p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1">
              No duplicate <code className="font-mono">bill_number</code> values found for this hospital.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {groups.length} duplicate group{groups.length === 1 ? "" : "s"} found —
                  {" "}{totalDupes} bill{totalDupes === 1 ? "" : "s"} need renumbering.
                </p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Fix keeps the oldest bill (by <code className="font-mono">created_at</code>) and renumbers the rest
                  using <code className="font-mono">generateBillNumber()</code>. Each rename is logged to{" "}
                  <code className="font-mono">audit_log</code>.
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Duplicate Bill Number</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Count</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Bill IDs</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Bill Dates</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Bill Types</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => {
                    const fixing = fixingKey === g.bill_number;
                    return (
                      <tr key={g.bill_number} className="border-t border-border align-top">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                          {g.bill_number}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="destructive" className="text-xs">{g.count}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground max-w-[260px]">
                          <div className="space-y-1">
                            {g.bills.map(b => (
                              <div key={b.id} className="truncate" title={b.id}>{b.id}</div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="space-y-1">
                            {g.bills.map(b => (
                              <div key={b.id}>
                                {b.bill_date
                                  ? new Date(b.bill_date).toLocaleDateString("en-IN")
                                  : "—"}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="space-y-1">
                            {g.bills.map(b => (
                              <div key={b.id}>
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {b.bill_type || "—"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => fixGroup(g)}
                            disabled={fixing || !!fixingKey}
                            className="gap-1.5"
                          >
                            {fixing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Wrench className="w-3.5 h-3.5" />
                            )}
                            {fixing ? "Fixing…" : "Fix"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillNumberAuditPage;
