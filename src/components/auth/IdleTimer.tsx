import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createPortal } from "react-dom";

const DEFAULT_TIMEOUT_MIN = 30;
const WARNING_LEAD_MS = 5 * 60 * 1000; // 5-minute warning before logout
const MIN_WARNING_MS = 60 * 1000;      // never less than 60s warning

// Role-based minimums (overrides hospital setting if stricter)
const ROLE_TIMEOUT_RULES: Record<string, { min?: number; max?: number; floor?: number }> = {
  pharmacy:      { max: 10 }, // pharmacy can never exceed 10 min
  pharmacist:    { max: 10 },
  billing_staff: { max: 15 }, // billing can never exceed 15 min
  cashier:       { max: 15 },
  super_admin:   { floor: 60 }, // super admin gets at least 60 min
  // doctor and others: use hospital setting as-is
};

function resolveTimeoutMinutes(hospitalMinutes: number, role: string | null): number {
  let mins = hospitalMinutes > 0 ? hospitalMinutes : DEFAULT_TIMEOUT_MIN;
  const rule = role ? ROLE_TIMEOUT_RULES[role] : null;
  if (rule) {
    if (rule.max !== undefined) mins = Math.min(mins, rule.max);
    if (rule.floor !== undefined) mins = Math.max(mins, rule.floor);
    if (rule.min !== undefined) mins = Math.max(mins, rule.min);
  }
  return mins;
}

const IdleTimer: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [timeoutMs, setTimeoutMs] = useState<number | null>(null); // null = disabled / loading
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Load hospital + role config on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setTimeoutMs(null); return; }

        const { data: me } = await supabase
          .from("users")
          .select("hospital_id, role")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!me) { if (!cancelled) setTimeoutMs(null); return; }

        // Cache role for other uses
        if (me.role) localStorage.setItem("aumrti_user_role", me.role);

        const { data: hosp } = await supabase
          .from("hospitals")
          .select("session_timeout_minutes")
          .eq("id", me.hospital_id)
          .maybeSingle();

        const hospMins = (hosp as any)?.session_timeout_minutes ?? DEFAULT_TIMEOUT_MIN;

        // 0 = "Never" (admin only) — disable the timer
        if (hospMins === 0 && me.role === "super_admin") {
          if (!cancelled) setTimeoutMs(null);
          return;
        }

        const finalMins = resolveTimeoutMinutes(hospMins, me.role);
        if (!cancelled) setTimeoutMs(finalMins * 60 * 1000);
      } catch {
        if (!cancelled) setTimeoutMs(DEFAULT_TIMEOUT_MIN * 60 * 1000);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const clearAllTimers = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const logout = useCallback(async () => {
    clearAllTimers();
    await supabase.auth.signOut();
    navigate("/login", { state: { message: "Session expired due to inactivity" }, replace: true });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (showWarning || timeoutMs === null) return;
    clearAllTimers();

    const warningMs = Math.min(WARNING_LEAD_MS, Math.max(MIN_WARNING_MS, timeoutMs / 4));
    const idleBeforeWarning = Math.max(timeoutMs - warningMs, 1000);
    const warningSeconds = Math.floor(warningMs / 1000);

    idleRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(warningSeconds);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      warningRef.current = setTimeout(() => {
        logout();
      }, warningMs);
    }, idleBeforeWarning);
  }, [showWarning, logout, timeoutMs]);

  const handleContinue = () => {
    clearAllTimers();
    setShowWarning(false);
    setTimeout(() => resetTimer(), 100);
  };

  useEffect(() => {
    if (timeoutMs === null) return; // disabled
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearAllTimers();
    };
  }, [resetTimer, timeoutMs]);

  if (!showWarning) return null;

  // Format countdown — show "M:SS" if > 60s, otherwise "Ns"
  const fmt = countdown >= 60
    ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
    : `${countdown}s`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Session Expiring</h2>
        <p className="text-muted-foreground mb-6">
          Your session will expire in <span className="font-bold text-destructive">{fmt}</span>.
          <br />Click "Stay Logged In" to keep working.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleContinue}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Stay Logged In
          </button>
          <button
            onClick={logout}
            className="px-6 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IdleTimer;
