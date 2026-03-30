import React from "react";
import ToothSVG, { type ToothData, type Surface } from "./ToothSVG";

// FDI numbering: Q1(UR):18-11, Q2(UL):21-28, Q3(LL):31-38, Q4(LR):48-41
const Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const Q3 = [31, 32, 33, 34, 35, 36, 37, 38];
const Q4 = [41, 42, 43, 44, 45, 46, 47, 48];

export type ChartData = Record<number, ToothData>;

interface FDIToothChartProps {
  chartData: ChartData;
  onSurfaceClick: (toothNumber: number, surface: Surface) => void;
}

const LEGEND = [
  { label: "Normal", color: "hsl(0 0% 100%)" },
  { label: "Caries", color: "hsl(0 84% 60%)" },
  { label: "Filling", color: "hsl(217 91% 60%)" },
  { label: "Crown", color: "hsl(45 93% 47%)" },
  { label: "RCT", color: "hsl(330 81% 60%)" },
  { label: "Missing", color: "hsl(0 0% 75%)" },
  { label: "Implant", color: "hsl(160 84% 39%)" },
  { label: "Bridge", color: "hsl(24 94% 50%)" },
];

const QuadrantRow: React.FC<{
  teeth: number[];
  chartData: ChartData;
  onSurfaceClick: (t: number, s: Surface) => void;
}> = ({ teeth, chartData, onSurfaceClick }) => (
  <div className="flex gap-1">
    {teeth.map((t) => (
      <ToothSVG key={t} toothNumber={t} data={chartData[t]} onSurfaceClick={onSurfaceClick} />
    ))}
  </div>
);

const FDIToothChart: React.FC<FDIToothChartProps> = ({ chartData, onSurfaceClick }) => {
  return (
    <div className="space-y-4">
      {/* Upper jaw */}
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Upper Right</p>
          <QuadrantRow teeth={Q1} chartData={chartData} onSurfaceClick={onSurfaceClick} />
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Upper Left</p>
          <QuadrantRow teeth={Q2} chartData={chartData} onSurfaceClick={onSurfaceClick} />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Lower jaw */}
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Lower Right</p>
          <QuadrantRow teeth={Q4.reverse().map((_, i) => [48, 47, 46, 45, 44, 43, 42, 41][i])} chartData={chartData} onSurfaceClick={onSurfaceClick} />
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Lower Left</p>
          <QuadrantRow teeth={Q3} chartData={chartData} onSurfaceClick={onSurfaceClick} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center pt-2 border-t border-border">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-border" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FDIToothChart;
