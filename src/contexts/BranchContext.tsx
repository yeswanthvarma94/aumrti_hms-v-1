import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Branch {
  id: string;
  name: string;
  city: string | null;
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

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [defaultHospitalId, setDefaultHospitalId] = useState<string | null>(null);
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

      const userRole = u?.role || null;
      setRole(userRole);
      setDefaultHospitalId(u?.hospital_id || null);

      const isMulti = userRole === "super_admin" || userRole === "ceo";

      if (isMulti) {
        const { data: hs } = await supabase
          .from("hospitals")
          .select("id, name, city")
          .order("name");
        setBranches(hs || []);
      } else if (u?.hospital_id) {
        const { data: h } = await supabase
          .from("hospitals")
          .select("id, name, city")
          .eq("id", u.hospital_id)
          .maybeSingle();
        setBranches(h ? [h] : []);
      }

      // initialize selected
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial = stored || u?.hospital_id || null;
      if (initial && initial !== selectedBranchId) {
        setSelectedBranchIdState(initial);
        if (initial) localStorage.setItem(STORAGE_KEY, initial);
      }
    } catch (e) {
      console.error("BranchContext load:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, [load]);

  const setSelectedBranchId = useCallback((id: string) => {
    setSelectedBranchIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
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
