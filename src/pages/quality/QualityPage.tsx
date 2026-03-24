import React, { useState } from "react";
import { BarChart3, Target, CalendarDays, AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NABHDashboard from "@/components/quality/NABHDashboard";
import QualityIndicatorsTab from "@/components/quality/QualityIndicatorsTab";
import AuditCalendarTab from "@/components/quality/AuditCalendarTab";
import IncidentReportsTab from "@/components/quality/IncidentReportsTab";
import CAPATrackerTab from "@/components/quality/CAPATrackerTab";
import InfectionControlTab from "@/components/quality/InfectionControlTab";
import FileIncidentModal from "@/components/quality/FileIncidentModal";
import ScheduleAuditModal from "@/components/quality/ScheduleAuditModal";

const navTabs = [
  { id: "nabh", label: "NABH Dashboard", emoji: "📊" },
  { id: "indicators", label: "Quality Indicators", emoji: "🎯" },
  { id: "audits", label: "Audit Calendar", emoji: "📅" },
  { id: "incidents", label: "Incident Reports", emoji: "🚨" },
  { id: "capa", label: "CAPA Tracker", emoji: "🔄" },
  { id: "infection", label: "Infection Control", emoji: "🦠" },
];

const QualityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("nabh");
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const renderContent = () => {
    switch (activeTab) {
      case "nabh": return <NABHDashboard />;
      case "indicators": return <QualityIndicatorsTab />;
      case "audits": return <AuditCalendarTab onScheduleAudit={() => setAuditModalOpen(true)} />;
      case "incidents": return <IncidentReportsTab key={refreshKey} onFileIncident={() => setIncidentModalOpen(true)} />;
      case "capa": return <CAPATrackerTab />;
      case "infection": return <InfectionControlTab />;
      default: return null;
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
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "h-11 flex items-center gap-3 px-4 text-sm transition-colors text-left",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className="text-sm">{tab.emoji}</span>
              <span className="flex-1">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </div>

      <FileIncidentModal
        open={incidentModalOpen}
        onOpenChange={setIncidentModalOpen}
        onFiled={() => setRefreshKey((k) => k + 1)}
      />
      <ScheduleAuditModal open={auditModalOpen} onOpenChange={setAuditModalOpen} />
    </div>
  );
};

export default QualityPage;
