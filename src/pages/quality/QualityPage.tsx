import React, { useState } from "react";
import { BarChart3, Target, CalendarDays, AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NABHDashboard from "@/components/quality/NABHDashboard";
import QualityIndicatorsTab from "@/components/quality/QualityIndicatorsTab";
import AuditCalendarTab from "@/components/quality/AuditCalendarTab";
import IncidentReportsTab from "@/components/quality/IncidentReportsTab";
import CAPATrackerTab from "@/components/quality/CAPATrackerTab";
import FileIncidentModal from "@/components/quality/FileIncidentModal";
import ScheduleAuditModal from "@/components/quality/ScheduleAuditModal";

const navTabs = [
  { id: "nabh", label: "NABH Dashboard", icon: BarChart3, emoji: "📊" },
  { id: "indicators", label: "Quality Indicators", icon: Target, emoji: "🎯" },
  { id: "audits", label: "Audit Calendar", icon: CalendarDays, emoji: "📅" },
  { id: "incidents", label: "Incident Reports", icon: AlertTriangle, emoji: "🚨" },
  { id: "capa", label: "CAPA Tracker", icon: RefreshCw, emoji: "🔄" },
  { id: "infection", label: "Infection Control", icon: Bug, emoji: "🦠", comingSoon: true },
];

const QualityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("nabh");
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "nabh": return <NABHDashboard />;
      case "indicators": return <QualityIndicatorsTab />;
      case "audits": return <AuditCalendarTab onScheduleAudit={() => setAuditModalOpen(true)} />;
      case "incidents": return <IncidentReportsTab onFileIncident={() => setIncidentModalOpen(true)} />;
      case "capa": return <CAPATrackerTab />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Bug className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Coming in Phase 20B</p>
              <p className="text-xs mt-1">Infection Control module under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      <div className="h-[52px] flex-shrink-0 bg-card border-b border-border flex items-center justify-between px-5">
        <span className="text-base font-bold text-foreground">Quality & Compliance</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIncidentModalOpen(true)}>
            + File Incident
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAuditModalOpen(true)}>
            + Schedule Audit
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[220px] bg-card border-r border-border flex flex-col">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
                className={cn(
                  "h-11 flex items-center gap-3 px-4 text-sm transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/50",
                  tab.comingSoon && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm">{tab.emoji}</span>
                <span className="flex-1">{tab.label}</span>
                {tab.comingSoon && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </div>

      <FileIncidentModal open={incidentModalOpen} onOpenChange={setIncidentModalOpen} />
      <ScheduleAuditModal open={auditModalOpen} onOpenChange={setAuditModalOpen} />
    </div>
  );
};

export default QualityPage;
