import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
}

const STORAGE_KEY = "selectedBranchId";

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
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // session: undefined = not yet resolved, null = unauthenticated, Session = authenticated
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();
  const [branchOverride, setBranchOverride] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null)
  );

  // Resolve auth session ONCE at app root
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession((prev) => {
        const prevId = prev && "user" in (prev as object) ? (prev as Session)?.user?.id : null;
        const newId = newSession?.user?.id ?? null;
        if (prevId !== newId) {
          queryClient.invalidateQueries({ queryKey: ["current-user"] });
          queryClient.invalidateQueries({ queryKey: ["hospital-record"] });
        }
        return newSession;
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
  const { data: userRecord, isLoading: userLoading, isFetching: userFetching } = useQuery({
    queryKey: ["current-user", authUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, hospital_id, role, full_name")
        .eq("auth_user_id", authUserId as string)
        .maybeSingle();
      if (error) {
        console.error("AuthContext: fetch user error:", error.message);
        return null;
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

  const defaultHospitalId = userRecord?.hospital_id ?? null;
  const userRole = userRecord?.role ?? null;

  // Validate stored branch override against the active hospital list.
  // For super_admin/ceo, the override is OK only if it matches a real active
  // hospital. For everyone else, it must match their own hospital_id.
  // This prevents a stale localStorage entry from a previous session/user
  // making every query target the wrong hospital (resulting in blank UIs).
  const canSwitchHospitals = userRole === "super_admin" || userRole === "ceo";

  const { data: validHospitalIds } = useQuery({
    queryKey: ["valid-hospital-ids", canSwitchHospitals],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id")
        .eq("is_active", true);
      if (error) {
        console.error("AuthContext: fetch hospitals error:", error.message);
        return [] as string[];
      }
      return (data || []).map((h: { id: string }) => h.id);
    },
    enabled: !!userRecord && canSwitchHospitals,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!userRecord || !branchOverride) return;

    let isValid = false;
    if (canSwitchHospitals) {
      // super_admin/ceo: override must be a known active hospital. While the
      // hospital list is still loading we don't drop the override yet.
      if (!validHospitalIds) return;
      isValid = validHospitalIds.includes(branchOverride);
    } else {
      isValid = branchOverride === defaultHospitalId;
    }

    if (!isValid) {
      localStorage.removeItem(STORAGE_KEY);
      setBranchOverride(null);
      window.dispatchEvent(new Event("branch:changed"));
      // Drop any cached data fetched against the wrong hospital.
      queryClient.invalidateQueries();
    }
  }, [userRecord, branchOverride, canSwitchHospitals, validHospitalIds, defaultHospitalId, queryClient]);

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
        console.error("AuthContext: fetch hospital error:", error.message);
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

  const loading =
    session === undefined ||
    (!!authUserId && userLoading && !userRecord && userFetching);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
