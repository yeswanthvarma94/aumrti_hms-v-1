import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useHospitalId } from "@/hooks/useHospitalId";

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  // Pre-fetch the user's hospital_id and role so downstream guards (RoleGuard) and
  // pages can read it from the TanStack Query cache without re-querying on every nav.
  useHospitalId();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: currentPath }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
