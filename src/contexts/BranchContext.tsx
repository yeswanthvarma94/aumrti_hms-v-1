import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

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
  // Reuse the resolved role + default hospital from AuthContext — no extra
  // `users` query (which was creating duplicate network calls and churn).
  const { role, hospitalId: defaultHospitalId, loading: authLoading } = useAuth();
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!defaultHospitalId) {
      setBranches([]);
      setLoading(false);
      return;
    }
    try {
      const isMulti = role ? MULTI_BRANCH_ROLES.includes(role) : false;

      let branchList: Branch[] = [];
      if (isMulti && (role === "super_admin" || role === "ceo")) {
        const { data: hs } = await supabase
          .from("hospitals")
          .select("id, name, state")
          .eq("is_active", true)
          .order("name");
        branchList = (hs as Branch[]) || [];
      } else {
        const { data: h } = await supabase
          .from("hospitals")
          .select("id, name, state")
          .eq("id", defaultHospitalId)
          .maybeSingle();
        branchList = h ? [h as Branch] : [];
      }
      setBranches(branchList);

      const stored = localStorage.getItem(STORAGE_KEY);
      const validStored = stored && branchList.some(b => b.id === stored) ? stored : null;
      const initial = validStored || defaultHospitalId || branchList[0]?.id || null;
      setSelectedBranchIdState(initial);
      if (initial) localStorage.setItem(STORAGE_KEY, initial);
    } catch (e) {
      console.error("BranchContext load:", e);
    } finally {
      setLoading(false);
    }
  }, [authLoading, defaultHospitalId, role]);

  useEffect(() => {
    load();
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
