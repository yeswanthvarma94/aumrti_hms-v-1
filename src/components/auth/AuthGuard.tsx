import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
