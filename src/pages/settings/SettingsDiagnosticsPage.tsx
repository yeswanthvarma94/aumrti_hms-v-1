import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Probe {
  table: string;
  label: string;
}

const PROBES: Probe[] = [
  { table: "users", label: "Staff / Users" },
  { table: "hospitals", label: "Hospital profile" },
  { table: "patients", label: "Patients" },
  { table: "departments", label: "Departments" },
  { table: "wards", label: "Wards" },
  { table: "beds", label: "Beds" },
  { table: "bills", label: "Bills" },
  { table: "opd_visits", label: "OPD visits" },
  { table: "drug_master", label: "Drug master" },
  { table: "service_master", label: "Service master" },
];

interface ProbeResult {
  count: number | null;
  error: string | null;
  ok: boolean;
}

async function probe(table: string, hospitalId: string): Promise<ProbeResult> {
  try {
    const { count, error } = await (supabase as any)
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId);
    if (error) return { count: null, error: error.message, ok: false };
    return { count: count ?? 0, error: null, ok: true };
  } catch (e: any) {
    return { count: null, error: e?.message || "Unknown error", ok: false };
  }
}

const SettingsDiagnosticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hospitalId, authUserId, userId, role, fullName, hospitalName, loading, authError } = useAuth();

  const { data: results, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["db-diagnostics", hospitalId],
    enabled: !!hospitalId,
    queryFn: async () => {
      const out: Record<string, ProbeResult> = {};
      await Promise.all(
        PROBES.map(async (p) => {
          out[p.table] = await probe(p.table, hospitalId as string);
        })
      );
      return out;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings")}
            className="text-muted-foreground hover:text-foreground active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Database size={18} className="text-primary" />
              Database Sync Diagnostics
            </h1>
            <p className="text-xs text-muted-foreground">
              Settings &rsaquo; Diagnostics
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Re-checking
            </>
          ) : (
            "Re-run checks"
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Identity card */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Account context
          </h2>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <Row label="Auth status" value={loading ? "Resolving…" : authUserId ? "Signed in" : "Not signed in"} />
            <Row label="Auth user id" value={authUserId ?? "—"} mono />
            <Row label="Profile id" value={userId ?? "—"} mono />
            <Row label="Hospital id" value={hospitalId ?? "—"} mono />
            <Row label="Hospital" value={hospitalName ?? "—"} />
            <Row label="Full name" value={fullName ?? "—"} />
            <Row label="Role" value={role ?? "—"} />
            <Row label="Auth error" value={authError ?? "None"} />
          </dl>
        </div>

        {/* Probes */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Hospital data tables
            </h2>
            <span className="text-xs text-muted-foreground">
              Counts are scoped to your hospital_id.
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Table</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Rows</th>
                <th className="text-left px-4 py-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {!hospitalId && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Cannot run probes: no hospital context resolved.
                  </td>
                </tr>
              )}
              {hospitalId &&
                PROBES.map((p) => {
                  const r = results?.[p.table];
                  const status = isLoading || !r ? "loading" : r.ok ? "ok" : "fail";
                  return (
                    <tr key={p.table} className="border-t border-border/50">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {p.label}
                        <span className="ml-2 text-[11px] text-muted-foreground font-mono">
                          {p.table}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {status === "loading" && (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" /> Checking
                          </span>
                        )}
                        {status === "ok" && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 size={14} /> Connected
                          </span>
                        )}
                        {status === "fail" && (
                          <span className="inline-flex items-center gap-1.5 text-destructive">
                            <XCircle size={14} /> Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {r?.count ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-destructive">
                        {r?.error ?? ""}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How to read this</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium">Connected with rows = 0</span>: the
              table is reachable and your hospital simply has no records yet.
              Add records from the relevant module.
            </li>
            <li>
              <span className="font-medium">Blocked</span>: a Row Level Security
              policy or schema issue is preventing access. Share the error
              message with the admin to fix it.
            </li>
            <li>
              <span className="font-medium">No hospital context</span>: you are
              not linked to a hospital. Sign out and sign in again, or contact
              your admin.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={`text-foreground ${mono ? "font-mono text-xs break-all" : ""}`}>
      {value}
    </dd>
  </>
);

export default SettingsDiagnosticsPage;
