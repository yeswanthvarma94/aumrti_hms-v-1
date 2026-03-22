import React from "react";
import { Stethoscope } from "lucide-react";
import type { OpdToken } from "@/pages/opd/OPDPage";

interface Props {
  token: OpdToken | null;
}

const ConsultationWorkspace: React.FC<Props> = ({ token }) => {
  if (!token) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
        <Stethoscope className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-base text-slate-400">Select a patient from the queue</p>
        <p className="text-[13px] text-slate-300 mt-1">or register a walk-in to begin</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
      <p className="text-xl font-bold text-slate-800">{token.patient?.full_name}</p>
      <p className="text-sm text-slate-400 mt-2">Token {token.token_number}</p>
      <p className="text-[13px] text-slate-300 mt-4">Consultation workspace — built in next prompt</p>
    </div>
  );
};

export default ConsultationWorkspace;
