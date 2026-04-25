import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  authUserId: string | null;
  hospitalId: string | null;
  userId: string | null;
  role: string | null;
  fullName: string | null;
  hospitalName: string | null;
  hospitalLogo: string | null;
  loading: boolean;
  /** True when the auth resolution chain has FAILED (stale token, missing users row, missing hospital). */
  authError: string | null;
  /** Force a clean sign-out + clear local storage + reload. Use from error screens. */
  forceSignOut: () => Promise<void>;
}

const STORAGE_KEY = "selectedBranchId";
const SUPABASE_AUTH_STORAGE_KEY = "aumrti-hms-auth";

const defaultValue: AuthContextValue = {
  session: null,
  user: null,
  authUserId: null,
  hospitalId: null,
  userId: null,
  role: null,
  fullName: null,
  hospitalName: null,
  hospitalLogo: null,
  loading: true,
  authError: null,
  forceSignOut: async () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

async function clearAuthAndReload() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignore — we're forcing a clear anyway
  }
  try {
    localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
    // Defensive: clear any other supabase-* keys that might be stale
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // session: undefined = not yet resolved, null = unauthenticated, Session = authenticated
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [branchOverride, setBranchOverride] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null)
  );
  const errorToastShown = useRef(false);

  // Resolve auth session ONCE at app root
  useEffect(() => {
    let mounted = true;

    // Safety timeout: if getSession() hangs (network / Supabase outage), surface it
    const timeout = setTimeout(() => {
      if (mounted && session === undefined) {
        console.error("AuthContext: getSession() did not resolve within 8s — assuming unauthenticated");
        setSession(null);
        setAuthError("Could not reach the authentication server. Please check your connection and try again.");
      }
    }, 8000);

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (!mounted) return;
      clearTimeout(timeout);
      if (error) {
        console.error("AuthContext: getSession error:", error);
        setAuthError(error.message);
      }
      setSession(s);
    }).catch((err) => {
      if (!mounted) return;
      clearTimeout(timeout);
      console.error("AuthContext: getSession threw:", err);
      setSession(null);
      setAuthError("Authentication failed to initialize.");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession((prev) => {
        const prevId = prev && "user" in (prev as object) ? (prev as Session)?.user?.id : null;
        const newId = newSession?.user?.id ?? null;
        if (prevId !== newId) {
          queryClient.invalidateQueries({ queryKey: ["current-user"] });
          queryClient.invalidateQueries({ queryKey: ["hospital-record"] });
          // New sign-in clears prior error
          if (newId) setAuthError(null);
        }
        return newSession;
      });
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  // Branch override listener (multi-branch hospitals)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setBranchOverride(e.newValue);
    };
    const onBranchChange = () =>
      setBranchOverride(localStorage.getItem(STORAGE_KEY));
    window.addEventListener("storage", onStorage);
    window.addEventListener("branch:changed", onBranchChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("branch:changed", onBranchChange as EventListener);
    };
  }, []);

  const authUserId = session === undefined ? null : session?.user?.id ?? null;

  // User record — cached forever (same query key as before so existing caches transfer)
  const { data: userRecord, isLoading: userLoading, isFetching: userFetching, error: userQueryError } = useQuery({
    queryKey: ["current-user", authUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, hospital_id, role, full_name")
        .eq("auth_user_id", authUserId as string)
        .maybeSingle();
      if (error) {
        console.error("AuthContext: fetch user error:", error);
        throw error;
      }
      return data;
    },
    enabled: !!authUserId,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Detect REAL profile failures only.
  // We only act when the query has DEFINITIVELY finished:
  //   - userRecord === null  → query ran and returned no row
  //   - userQueryError set   → query ran and errored (RLS, network)
  // We never treat `undefined` (still resolving) as a failure — that race
  // was causing healthy users to be auto-signed-out right after login.
  useEffect(() => {
    if (!authUserId) return;
    if (userLoading || userFetching) return;
    // Successful row — clear any prior error.
    if (userRecord && userRecord.hospital_id) {
      if (authError) setAuthError(null);
      errorToastShown.current = false;
      return;
    }
    // Real error from the query.
    if (userQueryError) {
      const msg = (userQueryError as Error).message || "Failed to load your profile.";
      setAuthError(`Profile lookup failed: ${msg}`);
      if (!errorToastShown.current) {
        errorToastShown.current = true;
        toast.error("Cannot load your account profile. Please sign in again.", { duration: 8000 });
      }
      return;
    }
    // Definite null (query ran, returned no row).
    if (userRecord === null) {
      setAuthError("Your account is not linked to any hospital. Please contact admin or sign in again.");
      if (!errorToastShown.current) {
        errorToastShown.current = true;
        toast.error("Account not linked to a hospital — please re-login.", { duration: 8000 });
      }
      return;
    }
    if (userRecord && !userRecord.hospital_id) {
      setAuthError("Your account has no hospital assigned. Please contact admin.");
      if (!errorToastShown.current) {
        errorToastShown.current = true;
        toast.error("No hospital assigned to your account.", { duration: 8000 });
      }
    }
    // Otherwise (userRecord === undefined): query hasn't completed yet — do nothing.
  }, [authUserId, userRecord, userLoading, userFetching, userQueryError, authError]);

  const defaultHospitalId = userRecord?.hospital_id ?? null;
  const hospitalId = branchOverride || defaultHospitalId;

  // Hospital branding — cached for 1 hour
  const { data: hospitalRecord } = useQuery({
    queryKey: ["hospital-record", hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("name, logo_url")
        .eq("id", hospitalId as string)
        .maybeSingle();
      if (error) {
        console.error("AuthContext: fetch hospital error:", error);
        return null;
      }
      return data;
    },
    enabled: !!hospitalId,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Stay in `loading` while the user-record query has not yet produced a result.
  // This prevents AuthGuard / consumers from rendering with `hospitalId === null`
  // during the brief window between session resolution and user-record arrival.
  const loading =
    session === undefined ||
    (!!authUserId && userRecord === undefined && !userQueryError);

  const value: AuthContextValue = {
    session: session ?? null,
    user: session?.user ?? null,
    authUserId,
    hospitalId,
    userId: userRecord?.id ?? null,
    role: userRecord?.role ?? null,
    fullName: userRecord?.full_name ?? null,
    hospitalName: hospitalRecord?.name ?? null,
    hospitalLogo: hospitalRecord?.logo_url ?? null,
    loading,
    authError,
    forceSignOut: clearAuthAndReload,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
