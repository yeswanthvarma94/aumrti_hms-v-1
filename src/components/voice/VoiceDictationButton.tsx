import React from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceDictation, VoiceContextType } from "@/hooks/useVoiceDictation";

interface Props {
  contextType: VoiceContextType;
  existingData?: Record<string, unknown>;
  onStructuredResult: (data: Record<string, unknown>) => void;
  className?: string;
  size?: "sm" | "md";
}

const VoiceDictationButton: React.FC<Props> = ({
  contextType,
  existingData,
  onStructuredResult,
  className,
  size = "md",
}) => {
  const {
    isRecording,
    isProcessing,
    transcript,
    isSupported,
    startRecording,
    stopRecording,
  } = useVoiceDictation({
    contextType,
    existingData,
    onStructuredResult,
  });

  if (!isSupported) return null;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs";

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          "rounded-md font-medium flex items-center gap-1.5 transition-all active:scale-[0.97]",
          btnSize,
          isRecording
            ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
            : isProcessing
            ? "bg-slate-200 text-slate-400 cursor-wait"
            : "bg-[#1A2F5A] text-white hover:bg-[#152647]"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className={cn(iconSize, "animate-spin")} />
            AI Processing…
          </>
        ) : isRecording ? (
          <>
            <MicOff className={iconSize} />
            Stop & Process
          </>
        ) : (
          <>
            <Mic className={iconSize} />
            Voice Dictate
          </>
        )}
      </button>

      {/* Live transcript preview */}
      {isRecording && transcript && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-w-sm min-w-[200px]">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Listening…</p>
          <p className="text-xs text-slate-700 leading-relaxed line-clamp-4">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceDictationButton;
