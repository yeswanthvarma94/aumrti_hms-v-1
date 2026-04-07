import React from "react";
import { Navigate } from "react-router-dom";
import { useHospitalId } from "@/hooks/useHospitalId";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const BYPASS_ROLES = ["super_admin", "hospital_admin"];

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { role, loading } = useHospitalId();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role && (BYPASS_ROLES.includes(role) || allowedRoles.includes(role))) {
    return <>{children}</>;
  }

  // Show toast on denied access
  toast({
    title: "Access denied",
    description: "You don't have permission to view this module.",
    variant: "destructive",
  });

  return <Navigate to="/dashboard" replace />;
};

export default RoleGuard;
