import React from "react";
import { Pill, ShoppingCart } from "lucide-react";

interface Props {
  hospitalId: string;
  mode: "ip" | "retail";
}

const PharmacyDispenseTab: React.FC<Props> = ({ mode }) => {
  return (
    <div className="h-full flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-3">
        {mode === "ip" ? (
          <>
            <span className="text-5xl">🏥</span>
            <p className="text-base font-semibold text-foreground">IP Dispensing Workspace</p>
            <p className="text-sm text-muted-foreground">
              Select a patient prescription to begin dispensing
            </p>
          </>
        ) : (
          <>
            <ShoppingCart size={48} className="mx-auto text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">Retail Counter</p>
            <p className="text-sm text-muted-foreground">
              Walk-in OTC & Rx sales workspace
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PharmacyDispenseTab;
