import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceScribe, SessionType } from "@/contexts/VoiceScribeContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Props {
  sessionType: SessionType;
  className?: string;
  size?: "sm" | "md";
}

const VoiceDictationButton: React.FC<Props> = ({ sessionType, className, size = "md" }) => {
  const {
    isRecording, setIsRecording,
    setIsPanelOpen, setPanelState,
    setRawTranscript, setStructuredOutput,
    setCurrentSessionType,
  } = useVoiceScribe();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fullTranscriptRef = useRef("");

  const isSupported = typeof window !== "undefined" && !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );

  const processTranscript = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;
    setPanelState("processing");
    setIsPanelOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-clinical-voice", {
        body: { transcript: rawText, context_type: sessionType },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setStructuredOutput(data.structured);
      setPanelState("output");
    } catch (err) {
      console.error("AI structuring failed:", err);
      setPanelState("fallback");
    }
  }, [sessionType, setPanelState, setIsPanelOpen, setStructuredOutput]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      toast({ title: "Voice not supported", description: "Use Chrome or Edge", variant: "destructive" });
      return;
    }

    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    const recognition = new (SR as new () => SpeechRecognitionLike)();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    fullTranscriptRef.current = "";
    setRawTranscript("");
    setCurrentSessionType(sessionType);

    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          final += r[0].transcript + " ";
        } else {
          interim += r[0].transcript;
        }
      }
      fullTranscriptRef.current = final;
      setRawTranscript(final + interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") {
        toast({ title: `Speech error: ${e.error}`, variant: "destructive" });
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (fullTranscriptRef.current.trim()) {
        processTranscript(fullTranscriptRef.current.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setIsPanelOpen(true);
    setPanelState("recording");
  }, [isSupported, sessionType, processTranscript, setIsRecording, setIsPanelOpen, setPanelState, setRawTranscript, setCurrentSessionType, toast]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  if (!isSupported) return null;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs";

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          "rounded-md font-medium flex items-center gap-1.5 transition-all active:scale-[0.97]",
          btnSize,
          isRecording
            ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
            : "bg-[#1A2F5A] text-white hover:bg-[#152647]"
        )}
      >
        {isRecording ? (
          <><MicOff className={iconSize} /> Stop & Process</>
        ) : (
          <><Mic className={iconSize} /> Voice Dictate</>
        )}
      </button>
    </div>
  );
};

export default VoiceDictationButton;
