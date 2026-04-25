import React from "react";
import { Navigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, authError, forceSignOut, authUserId, hospitalId } = useAuth();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: currentPath }} replace />;
  }

  // Logged in via Supabase Auth, but profile lookup failed or returned nothing.
  // Without this guard the entire app appears empty (no module can fetch data).
  if (authUserId && !hospitalId && authError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Session error</h2>
          <p className="text-sm text-muted-foreground">{authError}</p>
          <p className="text-xs text-muted-foreground">
            This usually means your session is stale or your account is not linked to a hospital. Sign in again to fix it.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => forceSignOut()} variant="default">
              Sign out & retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
