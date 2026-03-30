import React from "react";

export type ToothStatus = "normal" | "caries" | "filling" | "crown" | "rct" | "missing" | "implant" | "bridge" | "extraction_planned";
export type Surface = "M" | "D" | "B" | "L" | "O";

export interface ToothData {
  surfaces: Partial<Record<Surface, ToothStatus>>;
  notes?: string;
  overallStatus?: ToothStatus;
}

const STATUS_COLORS: Record<ToothStatus, string> = {
  normal: "hsl(0 0% 100%)",
  caries: "hsl(0 84% 60%)",
  filling: "hsl(217 91% 60%)",
  crown: "hsl(45 93% 47%)",
  rct: "hsl(330 81% 60%)",
  missing: "hsl(0 0% 75%)",
  implant: "hsl(160 84% 39%)",
  bridge: "hsl(24 94% 50%)",
  extraction_planned: "hsl(0 84% 60%)",
};

interface ToothSVGProps {
  toothNumber: number;
  data?: ToothData;
  onSurfaceClick: (toothNumber: number, surface: Surface) => void;
  size?: number;
}

const ToothSVG: React.FC<ToothSVGProps> = ({ toothNumber, data, onSurfaceClick, size = 44 }) => {
  const getColor = (surface: Surface) => {
    const status = data?.surfaces?.[surface] || "normal";
    return STATUS_COLORS[status];
  };

  const isMissing = data?.overallStatus === "missing";
  const isExtractionPlanned = data?.overallStatus === "extraction_planned";
  const half = size / 2;
  const inner = size * 0.28;

  if (isMissing) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="cursor-pointer">
          <rect x={1} y={1} width={size - 2} height={size - 2} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} rx={2} />
          <line x1={4} y1={4} x2={size - 4} y2={size - 4} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
          <line x1={size - 4} y1={4} x2={4} y2={size - 4} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
        </svg>
        <span className="text-[9px] font-mono text-muted-foreground">{toothNumber}</span>
      </div>
    );
  }

  // 5 triangular segments: B(top), L(bottom), M(left), D(right), O(center square)
  const centerX1 = half - inner;
  const centerY1 = half - inner;
  const centerX2 = half + inner;
  const centerY2 = half + inner;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="cursor-pointer">
        <rect x={1} y={1} width={size - 2} height={size - 2} fill="none" stroke="hsl(var(--border))" strokeWidth={1} rx={2} />
        {/* B - Buccal (top triangle) */}
        <polygon
          points={`1,1 ${size - 1},1 ${centerX2},${centerY1} ${centerX1},${centerY1}`}
          fill={getColor("B")}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          onClick={() => onSurfaceClick(toothNumber, "B")}
          className="hover:opacity-70 transition-opacity"
        />
        {/* L - Lingual (bottom triangle) */}
        <polygon
          points={`1,${size - 1} ${size - 1},${size - 1} ${centerX2},${centerY2} ${centerX1},${centerY2}`}
          fill={getColor("L")}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          onClick={() => onSurfaceClick(toothNumber, "L")}
          className="hover:opacity-70 transition-opacity"
        />
        {/* M - Mesial (left triangle) */}
        <polygon
          points={`1,1 1,${size - 1} ${centerX1},${centerY2} ${centerX1},${centerY1}`}
          fill={getColor("M")}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          onClick={() => onSurfaceClick(toothNumber, "M")}
          className="hover:opacity-70 transition-opacity"
        />
        {/* D - Distal (right triangle) */}
        <polygon
          points={`${size - 1},1 ${size - 1},${size - 1} ${centerX2},${centerY2} ${centerX2},${centerY1}`}
          fill={getColor("D")}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          onClick={() => onSurfaceClick(toothNumber, "D")}
          className="hover:opacity-70 transition-opacity"
        />
        {/* O - Occlusal (center square) */}
        <rect
          x={centerX1}
          y={centerY1}
          width={inner * 2}
          height={inner * 2}
          fill={getColor("O")}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          onClick={() => onSurfaceClick(toothNumber, "O")}
          className="hover:opacity-70 transition-opacity"
        />
        {isExtractionPlanned && (
          <>
            <line x1={4} y1={4} x2={size - 4} y2={size - 4} stroke="hsl(0 84% 60%)" strokeWidth={2} strokeDasharray="3,2" />
            <line x1={size - 4} y1={4} x2={4} y2={size - 4} stroke="hsl(0 84% 60%)" strokeWidth={2} strokeDasharray="3,2" />
          </>
        )}
      </svg>
      <span className="text-[9px] font-mono text-muted-foreground">{toothNumber}</span>
    </div>
  );
};

export default ToothSVG;
