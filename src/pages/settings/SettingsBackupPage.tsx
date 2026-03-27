import React from "react";
import SettingsPageWrapper from "@/components/settings/SettingsPageWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Users, Receipt, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const auditLog = [
  { date: "27 Mar 2026, 14:30", user: "Dr. Rajesh", action: "Discharged patient", module: "IPD" },
  { date: "27 Mar 2026, 13:15", user: "Admin", action: "Updated service rate", module: "Settings" },
  { date: "27 Mar 2026, 12:00", user: "Nurse Priya", action: "Recorded vitals", module: "Nursing" },
  { date: "27 Mar 2026, 11:30", user: "Billing Exec", action: "Generated bill #4521", module: "Billing" },
  { date: "27 Mar 2026, 10:45", user: "Lab Tech", action: "Published CBC result", module: "Lab" },
];

const SettingsBackupPage: React.FC = () => {
  const { toast } = useToast();

  const exportData = (type: string) => {
    toast({ title: `${type} export started`, description: "Download will begin shortly." });
  };

  return (
    <SettingsPageWrapper title="Backup & Export" hideSave>
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Data Export</h2>
          <p className="text-sm text-muted-foreground mb-4">Export your hospital data at any time.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Export All Patients", desc: "CSV of patients table" },
              { icon: Receipt, label: "Export All Bills", desc: "CSV of bills + payments" },
              { icon: FileSpreadsheet, label: "Export Staff Data", desc: "CSV of users + profiles" },
            ].map((e) => (
              <button key={e.label} onClick={() => exportData(e.label)} className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition-colors">
                <e.icon size={20} className="text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">{e.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Audit Log</h2>
            <Button variant="outline" size="sm" className="gap-1"><Download size={13} /> Export Audit Log</Button>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">User</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Action</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Module</th>
              </tr></thead>
              <tbody>
                {auditLog.map((l, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{l.date}</td>
                    <td className="px-3 py-2 text-foreground">{l.user}</td>
                    <td className="px-3 py-2 text-foreground">{l.action}</td>
                    <td className="px-3 py-2"><Badge variant="outline">{l.module}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-start gap-3 bg-accent/30 border border-border rounded-lg p-4">
          <Info size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Automatic Backups</p>
            <p className="text-xs text-muted-foreground mt-1">Your data is automatically backed up by Supabase daily. Point-in-time recovery available. Contact support for restore requests.</p>
          </div>
        </div>
      </div>
    </SettingsPageWrapper>
  );
};

export default SettingsBackupPage;
