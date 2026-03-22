import React, { useState, useCallback } from "react";
import PrescriptionQueue, { type PrescriptionItem } from "./ip/PrescriptionQueue";
import DispensingWorkspace from "./ip/DispensingWorkspace";
import PatientStockPanel from "./ip/PatientStockPanel";
import { ShoppingCart } from "lucide-react";

interface Props {
  hospitalId: string;
  mode: "ip" | "retail";
}

const PharmacyDispenseTab: React.FC<Props> = ({ hospitalId, mode }) => {
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionItem | null>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [stockItems, setStockItems] = useState<{ drug_name: string; available: number; nearest_expiry?: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelect = useCallback((item: PrescriptionItem) => {
    setSelectedPrescription(item);
  }, []);

  const handleDispensed = useCallback(() => {
    setSelectedPrescription(null);
    setPatientInfo(null);
    setStockItems([]);
    setRefreshKey(k => k + 1);
  }, []);

  const handlePatientLoaded = useCallback((p: any) => {
    setPatientInfo(p);
  }, []);

  const handleDrugsLoaded = useCallback((drugs: { drug_name: string; available: number; nearest_expiry?: string }[]) => {
    setStockItems(drugs);
  }, []);

  if (mode === "retail") {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-3">
          <ShoppingCart size={48} className="mx-auto text-muted-foreground/40" />
          <p className="text-base font-semibold text-foreground">Retail Counter</p>
          <p className="text-sm text-muted-foreground">Walk-in OTC & Rx sales workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-row overflow-hidden">
      <PrescriptionQueue
        key={refreshKey}
        hospitalId={hospitalId}
        selectedId={selectedPrescription?.id || null}
        onSelect={handleSelect}
        onManualDispense={() => {}}
      />
      <DispensingWorkspace
        hospitalId={hospitalId}
        prescription={selectedPrescription}
        onDispensed={handleDispensed}
        onPatientLoaded={handlePatientLoaded}
        onDrugsLoaded={handleDrugsLoaded}
      />
      <PatientStockPanel
        patient={patientInfo}
        stockItems={stockItems}
        todayDispensed={[]}
        todayTotal={0}
      />
    </div>
  );
};

export default PharmacyDispenseTab;
