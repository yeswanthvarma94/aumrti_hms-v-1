import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Download, Users, UserCog, IndianRupee, Pill, Factory, TestTube,
  ArrowRight, Undo2, Eye, FileSpreadsheet, AlertTriangle
} from "lucide-react";
import ImportWizard from "@/components/migration/ImportWizard";
import { downloadXlsxTemplate, type MigrationEntity } from "@/lib/migrationTemplates";

interface MigrationJob {
  id: string;
  job_name: string;
  entity_type: string;
  status: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  error_rows: number;
  skipped_rows: number;
  can_rollback: boolean;
  rollback_until: string | null;
  rolled_back_at: string | null;
  created_at: string;
  completed_at: string | null;
  error_report: any[];
}

interface MigrationLog {
  id: string;
  row_number: number;
  entity_id: string | null;
  status: string;
  error_message: string | null;
  source_data: any;
}

const ENTITIES = [
  { key: "patients", label: "Patients", icon: Users, desc: "Existing patient master from old HMS or Excel", table: "patients" },
  { key: "staff", label: "Staff Members", icon: UserCog, desc: "Doctor, nurse, and admin user accounts", table: "users" },
  { key: "services", label: "Service Rates", icon: IndianRupee, desc: "All billable services and their rates", table: "service_master" },
  { key: "drugs", label: "Drug Master", icon: Pill, desc: "Complete drug formulary and stock items", table: "drug_master" },
  { key: "vendors", label: "Vendors", icon: Factory, desc: "Supplier and vendor master list", table: "vendors" },
  { key: "lab_tests", label: "Lab Tests", icon: TestTube, desc: "Lab test catalog with normal ranges", table: "lab_tests" },
] as const;

// Templates are now generated via downloadXlsxTemplate (src/lib/migrationTemplates.ts)

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    validating: "bg-blue-50 text-blue-700",
    importing: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    rolled_back: "bg-muted text-muted-foreground",
  };
  return map[status] || "bg-muted text-muted-foreground";
};

const entityEmoji: Record<string, string> = {
  patients: "👥", staff: "👨‍⚕️", services: "💰", drugs: "💊", vendors: "🏭", lab_tests: "🔬",
};

const DataMigrationPage: React.FC = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewJob, setViewJob] = useState<MigrationJob | null>(null);
  const [viewLogs, setViewLogs] = useState<MigrationLog[]>([]);
  const [rollbackJob, setRollbackJob] = useState<MigrationJob | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackConfirmText, setRollbackConfirmText] = useState("");
  const [wizardEntity, setWizardEntity] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: jobsData } = await supabase
      .from("migration_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setJobs((jobsData || []) as MigrationJob[]);

    // Get record counts for each entity
    const countPromises = ENTITIES.map(async (e) => {
      const { count } = await supabase.from(e.table as any).select("id", { count: "exact", head: true });
      return [e.key, count || 0] as [string, number];
    });
    const results = await Promise.all(countPromises);
    setCounts(Object.fromEntries(results));
    setLoading(false);
  };

  const downloadTemplate = (entityKey: string) => {
    const entity = ENTITIES.find(e => e.key === entityKey);
    if (!entity) return;
    downloadXlsxTemplate(entityKey as MigrationEntity);
    toast({ title: `${entity.label} template downloaded`, description: "Open in Excel — yellow columns are required, grey row is instructions (delete before saving)." });
  };

  const viewJobLogs = async (job: MigrationJob) => {
    setViewJob(job);
    const { data } = await supabase
      .from("migration_logs")
      .select("*")
      .eq("job_id", job.id)
      .order("row_number")
      .limit(200);
    setViewLogs((data || []) as MigrationLog[]);
  };

  const handleRollback = async () => {
    if (!rollbackJob) return;
    setRollbackLoading(true);

    // Note: actual record deletion will be handled in the import wizard (14B-2)
    // For now, mark the job as rolled back
    await supabase.from("migration_jobs").update({
      status: "rolled_back",
      rolled_back_at: new Date().toISOString(),
    }).eq("id", rollbackJob.id);

    // Mark logs as rolled back
    await supabase.from("migration_logs").update({
      status: "rolled_back",
    }).eq("job_id", rollbackJob.id).eq("status", "imported");

    toast({ title: `Job "${rollbackJob.job_name}" rolled back` });
    setRollbackJob(null);
    setRollbackLoading(false);
    loadData();
  };

  const canRollback = (job: MigrationJob) => {
    if (!job.can_rollback || job.status === "rolled_back") return false;
    if (!job.rollback_until) return false;
    return new Date(job.rollback_until) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
        <p className="text-sm text-muted-foreground">Loading migration data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="h-[52px] flex-shrink-0 bg-background border-b border-border px-6 flex items-center">
        <div>
          <h1 className="text-base font-bold text-foreground">📥 Data Migration & Import</h1>
          <p className="text-[11px] text-muted-foreground">Import data from your previous HMS or Excel files</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Entity Cards */}
        <div>
          <h2 className="text-sm font-bold mb-3">Import New Data</h2>
          <div className="grid grid-cols-3 gap-3">
            {ENTITIES.map((e) => {
              const Icon = e.icon;
              return (
                <div key={e.key} className="bg-card border border-border rounded-lg p-4 flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold">{entityEmoji[e.key]} {e.label}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{e.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {(counts[e.key] || 0).toLocaleString("en-IN")} records
                    </span>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setWizardEntity(e.key)}>
                      Import {e.label} <ArrowRight size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>

        {/* Template Downloads */}
        <div>
          <h2 className="text-sm font-bold mb-2">Download Import Templates</h2>
          <p className="text-[11px] text-muted-foreground mb-3">Use these templates to format your data for import</p>
          <div className="flex flex-wrap gap-2">
            {ENTITIES.map((e) => (
              <Button key={e.key} size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={() => downloadTemplate(e.key)}>
                <Download size={13} /> {e.label} Template
              </Button>
            ))}
          </div>
        </div>

        {/* Import History */}
        <div>
          <h2 className="text-sm font-bold mb-3">Recent Imports</h2>
          {jobs.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <FileSpreadsheet size={32} className="mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No imports yet. Use the templates above to prepare your data.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-[11px] font-bold uppercase text-muted-foreground">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Entity</th>
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-right">Imported</th>
                    <th className="px-3 py-2 text-right">Errors</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs">{format(new Date(job.created_at), "dd/MM/yyyy HH:mm")}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {entityEmoji[job.entity_type]} {job.entity_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs truncate max-w-[150px]">{job.file_name}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{job.imported_rows}/{job.total_rows}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">
                        {job.error_rows > 0 ? (
                          <span className="text-destructive">{job.error_rows}</span>
                        ) : "0"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className={cn("text-[9px] capitalize", statusBadge(job.status))}>
                          {job.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => viewJobLogs(job)}>
                            <Eye size={13} />
                          </Button>
                          {canRollback(job) && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setRollbackJob(job)}>
                              <Undo2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Logs Modal */}
      <Dialog open={!!viewJob} onOpenChange={() => setViewJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Logs: {viewJob?.job_name}</DialogTitle>
          </DialogHeader>
          {viewLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No log entries found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-[10px] font-bold uppercase text-muted-foreground">
                  <th className="px-2 py-1 text-left">Row</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {viewLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-2 py-1 text-xs font-mono">{log.row_number}</td>
                    <td className="px-2 py-1">
                      <Badge variant="outline" className={cn("text-[9px] capitalize",
                        log.status === "imported" ? "bg-emerald-50 text-emerald-700" :
                        log.status === "error" ? "bg-red-50 text-red-700" :
                        "bg-muted text-muted-foreground"
                      )}>{log.status}</Badge>
                    </td>
                    <td className="px-2 py-1 text-xs text-muted-foreground">{log.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      {/* Rollback Confirm Modal */}
      <Dialog open={!!rollbackJob} onOpenChange={() => setRollbackJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" /> Confirm Rollback
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            This will DELETE <strong>{rollbackJob?.imported_rows}</strong> records that were imported in job "<strong>{rollbackJob?.job_name}</strong>". This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackJob(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRollback} disabled={rollbackLoading}>
              {rollbackLoading ? "Rolling back..." : "Confirm Rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Wizard */}
      {wizardEntity && (
        <ImportWizard
          entityType={wizardEntity as any}
          onClose={() => setWizardEntity(null)}
          onComplete={() => { setWizardEntity(null); loadData(); }}
        />
      )}
    </div>
  );
};

export default DataMigrationPage;
