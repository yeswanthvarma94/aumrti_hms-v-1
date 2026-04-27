import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Branch {
  id: string;
  name: string;
  state: string | null;
}

interface BranchContextValue {
  selectedBranchId: string | null;
  branches: Branch[];
  role: string | null;
  canSwitch: boolean;
  loading: boolean;
  setSelectedBranchId: (id: string) => void;
  selectedBranch: Branch | null;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

const STORAGE_KEY = "selectedBranchId";
const MULTI_BRANCH_ROLES = ["super_admin", "ceo", "hospital_admin"];

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: u } = await supabase
        .from("users")
        .select("hospital_id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const userRole = (u?.role as string) || null;
      setRole(userRole);

      const isMulti = userRole ? MULTI_BRANCH_ROLES.includes(userRole) : false;

      let branchList: Branch[] = [];
      if (isMulti && (userRole === "super_admin" || userRole === "ceo")) {
        const { data: hs } = await supabase
          .from("hospitals")
          .select("id, name, state")
          .eq("is_active", true)
          .order("name");
        branchList = (hs as Branch[]) || [];
      } else if (u?.hospital_id) {
        const { data: h } = await supabase
          .from("hospitals")
          .select("id, name, state")
          .eq("id", u.hospital_id)
          .maybeSingle();
        branchList = h ? [h as Branch] : [];
      }
      setBranches(branchList);

      const stored = localStorage.getItem(STORAGE_KEY);
      const validStored = stored && branchList.some(b => b.id === stored) ? stored : null;
      const initial = validStored || u?.hospital_id || branchList[0]?.id || null;
      setSelectedBranchIdState(initial);
      if (initial) {
        const prev = localStorage.getItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, initial);
        // If we just corrected a stale/invalid stored branch, notify the rest
        // of the app (AuthContext, query consumers) so they refetch against
        // the correct hospital instead of the previous user's hospital.
        if (prev !== initial) {
          window.dispatchEvent(new CustomEvent("branch:changed", { detail: { id: initial } }));
          queryClient.invalidateQueries();
        }
      } else if (localStorage.getItem(STORAGE_KEY)) {
        // No valid branch for this user — clear any stale override.
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event("branch:changed"));
        queryClient.invalidateQueries();
      }
    } catch (e) {
      console.error("BranchContext load:", e);
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, [load]);

  const setSelectedBranchId = useCallback((id: string) => {
    setSelectedBranchIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("branch:changed", { detail: { id } }));
    queryClient.invalidateQueries();
  }, [queryClient]);

  const canSwitch = (role === "super_admin" || role === "ceo") && branches.length > 1;
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  return (
    <BranchContext.Provider value={{
      selectedBranchId,
      branches,
      role,
      canSwitch,
      loading,
      setSelectedBranchId,
      selectedBranch,
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
};
