import React from "react";
import { BedDouble } from "lucide-react";
import type { BedData } from "@/pages/ipd/IPDPage";

interface Props {
  bed: BedData | null;
}

const IPDWorkspace: React.FC<Props> = ({ bed }) => {
  if (!bed) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
        <BedDouble className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-base text-slate-400">Click a bed to view patient details</p>
        <p className="text-[13px] text-slate-300 mt-1">or click an available bed to admit a new patient</p>
      </div>
    );
  }

  if (bed.status === "occupied" && bed.admission) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
        <p className="text-xl font-bold text-slate-800">{bed.admission.patient_name}</p>
        <p className="text-sm text-slate-500 mt-1">Bed {bed.bed_number} · Day {bed.admission.los_days}</p>
        <p className="text-sm text-slate-400 mt-1">Dr. {bed.admission.doctor_name}</p>
        <p className="text-[13px] text-slate-300 mt-4">Patient workspace — built in next prompt</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
      <BedDouble className="h-10 w-10 text-green-400 mb-3" />
      <p className="text-base text-slate-600">Bed {bed.bed_number} is {bed.status}</p>
      <p className="text-[13px] text-slate-300 mt-2">Admission form — built in next prompt</p>
    </div>
  );
};

export default IPDWorkspace;
