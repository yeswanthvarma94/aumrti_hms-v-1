import React from "react";
import { Stethoscope } from "lucide-react";
import type { OpdToken } from "@/pages/opd/OPDPage";

interface Props {
  token: OpdToken | null;
}

const PatientSummary: React.FC<Props> = ({ token }) => {
  if (!token) {
    return (
      <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col items-center justify-center">
        <Stethoscope className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-[13px] text-slate-400">Patient details will appear here</p>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col items-center justify-center">
      <p className="text-lg font-bold text-slate-800">{token.patient?.full_name}</p>
      <p className="text-xs text-slate-400 mt-1">{token.patient?.uhid}</p>
      <p className="text-[13px] text-slate-300 mt-4">Patient summary — built in next prompt</p>
    </div>
  );
};

export default PatientSummary;
