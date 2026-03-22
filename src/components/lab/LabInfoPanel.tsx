import React from "react";
import { User } from "lucide-react";

interface Props {
  selectedOrder: any | null;
}

const LabInfoPanel: React.FC<Props> = ({ selectedOrder }) => {
  if (!selectedOrder) {
    return (
      <div className="w-[300px] shrink-0 bg-card border-l border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Patient details appear here</p>
      </div>
    );
  }

  const patient = selectedOrder.patients;
  const items = selectedOrder.lab_order_items || [];

  return (
    <div className="w-[300px] shrink-0 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Patient Card */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Patient Details</p>
        {patient ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--sidebar-background))] text-white flex items-center justify-center text-sm font-bold">
                {patient.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{patient.full_name}</p>
                <p className="text-xs text-muted-foreground">{patient.uhid}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User size={16} />
            <span className="text-sm">No patient data</span>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Summary</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-lg font-bold text-foreground">{items.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Tests</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-lg font-bold text-foreground">
              {items.filter((i: any) => i.status === "reported").length}
            </p>
            <p className="text-[10px] text-muted-foreground">Reported</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-lg font-bold text-foreground capitalize">{selectedOrder.priority}</p>
            <p className="text-[10px] text-muted-foreground">Priority</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-lg font-bold text-foreground capitalize">{selectedOrder.status.replace("_", " ")}</p>
            <p className="text-[10px] text-muted-foreground">Status</p>
          </div>
        </div>
      </div>

      {/* Clinical Notes */}
      <div className="p-4 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Clinical Notes</p>
        <p className="text-sm text-foreground">
          {selectedOrder.clinical_notes || "No clinical notes provided."}
        </p>
      </div>
    </div>
  );
};

export default LabInfoPanel;
