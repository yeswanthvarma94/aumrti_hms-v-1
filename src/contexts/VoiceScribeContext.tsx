import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type PanelState = "ready" | "recording" | "processing" | "output" | "fallback";
export type SessionType = "opd_consultation" | "ward_round" | "emergency" | "nursing_note";

interface VoiceScribeContextType {
  isRecording: boolean;
  isPanelOpen: boolean;
  panelState: PanelState;
  rawTranscript: string;
  structuredOutput: Record<string, unknown> | null;
  currentSessionType: SessionType;
  setIsRecording: (v: boolean) => void;
  setIsPanelOpen: (v: boolean) => void;
  setPanelState: (v: PanelState) => void;
  setRawTranscript: (v: string) => void;
  setStructuredOutput: (v: Record<string, unknown> | null) => void;
  setCurrentSessionType: (v: SessionType) => void;
  registerScreen: (screenId: string, fillFn: (data: Record<string, unknown>) => void) => void;
  unregisterScreen: (screenId: string) => void;
  applyToCurrentScreen: () => void;
  resetSession: () => void;
}

const VoiceScribeContext = createContext<VoiceScribeContextType | null>(null);

export const useVoiceScribe = () => {
  const ctx = useContext(VoiceScribeContext);
  if (!ctx) throw new Error("useVoiceScribe must be used inside VoiceScribeProvider");
  return ctx;
};

export const VoiceScribeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>("ready");
  const [rawTranscript, setRawTranscript] = useState("");
  const [structuredOutput, setStructuredOutput] = useState<Record<string, unknown> | null>(null);
  const [currentSessionType, setCurrentSessionType] = useState<SessionType>("opd_consultation");
  const screenFillFns = useRef<Map<string, (data: Record<string, unknown>) => void>>(new Map());

  const registerScreen = useCallback((screenId: string, fillFn: (data: Record<string, unknown>) => void) => {
    screenFillFns.current.set(screenId, fillFn);
  }, []);

  const unregisterScreen = useCallback((screenId: string) => {
    screenFillFns.current.delete(screenId);
  }, []);

  const applyToCurrentScreen = useCallback(() => {
    if (!structuredOutput) return;
    // Call all registered fill functions
    screenFillFns.current.forEach((fn) => fn(structuredOutput));
  }, [structuredOutput]);

  const resetSession = useCallback(() => {
    setIsRecording(false);
    setPanelState("ready");
    setRawTranscript("");
    setStructuredOutput(null);
  }, []);

  return (
    <VoiceScribeContext.Provider value={{
      isRecording, isPanelOpen, panelState, rawTranscript, structuredOutput,
      currentSessionType, setIsRecording, setIsPanelOpen, setPanelState,
      setRawTranscript, setStructuredOutput, setCurrentSessionType,
      registerScreen, unregisterScreen, applyToCurrentScreen, resetSession,
    }}>
      {children}
    </VoiceScribeContext.Provider>
  );
};
