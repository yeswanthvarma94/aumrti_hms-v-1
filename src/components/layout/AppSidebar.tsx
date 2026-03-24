import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Stethoscope,
  FlaskConical,
  Pill,
  IndianRupee,
  MoreHorizontal,
  LogOut,
  Activity,
  BedDouble,
  Siren,
  Scissors,
  HeartPulse,
  UserPlus,
  TestTube,
  ScanLine,
  Receipt,
  Shield,
  CreditCard,
  Users,
  Package,
  Award,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubItem {
  label: string;
  path: string;
  icon: React.ElementType;
  subtitle?: string;
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  path?: string;
  comingSoon?: boolean;
  subItems?: SubItem[];
}

const READY_ROUTES = new Set(["/dashboard", "/patients", "/opd", "/ipd", "/emergency"]);

const navGroups: NavGroup[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  {
    label: "Patients",
    icon: UserPlus,
    path: "/patients",
    subItems: [
      { label: "All Patients", path: "/patients", icon: Users, subtitle: "Patient registry & search" },
      { label: "New Patient", path: "/patients?register=true", icon: UserPlus, subtitle: "Register a new patient" },
    ],
  },
  {
    label: "Clinical",
    icon: Stethoscope,
    path: "/opd",
    subItems: [
      { label: "OPD Queue", path: "/opd", icon: Activity, subtitle: "Outpatient consultations" },
      { label: "IPD / Wards", path: "/ipd", icon: BedDouble, subtitle: "Admitted patients & beds" },
      { label: "Emergency", path: "/emergency", icon: Siren, subtitle: "Emergency triage & treatment" },
      { label: "Operation Theatre", path: "/ot", icon: Scissors, subtitle: "OT scheduling & checklists" },
      { label: "Nursing", path: "/nursing", icon: HeartPulse, subtitle: "MAR, vitals & handover" },
    ],
  },
  {
    label: "Diagnostics",
    icon: FlaskConical,
    subItems: [
      { label: "Lab", path: "/lab", icon: TestTube, subtitle: "Lab orders & results" },
      { label: "Radiology", path: "/radiology", icon: ScanLine, subtitle: "Imaging & reports" },
    ],
  },
  {
    label: "Pharmacy",
    icon: Pill,
    path: "/pharmacy",
    subItems: [
      { label: "IP Dispensing", path: "/pharmacy", icon: Pill, subtitle: "Dispense for admitted patients" },
      { label: "Retail Counter", path: "/pharmacy?mode=retail", icon: Pill, subtitle: "Walk-in OTC & Rx sales" },
      { label: "Stock", path: "/pharmacy?tab=stock", icon: Pill, subtitle: "Inventory & batches" },
      { label: "NDPS Register", path: "/pharmacy?tab=ndps", icon: Pill, subtitle: "Schedule H/H1/X register" },
    ],
  },
  {
    label: "Finance",
    icon: IndianRupee,
    path: "/billing",
    subItems: [
      { label: "Billing", path: "/billing", icon: Receipt, subtitle: "Patient billing" },
      { label: "Insurance", path: "/insurance", icon: Shield, subtitle: "TPA & claims" },
      { label: "Payments", path: "/payments", icon: CreditCard, subtitle: "Collections & receipts" },
    ],
  },
  {
    label: "More",
    icon: MoreHorizontal,
    subItems: [
      { label: "HR & Payroll", path: "/hr", icon: Users, subtitle: "Staff, roster & payroll" },
      { label: "Inventory", path: "/inventory", icon: Package, comingSoon: true },
      { label: "Quality", path: "/quality", icon: Award, comingSoon: true },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/login", { replace: true });
  };

  const isActive = (group: NavGroup) => {
    if (group.path) return location.pathname === group.path;
    return group.subItems?.some((s) => location.pathname.startsWith(s.path)) ?? false;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-[56px] bottom-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-3">
        {navGroups.map((group) => {
          const Icon = group.icon;
          const active = isActive(group);
          const hasSubmenu = !!group.subItems;

          const handleGroupClick = (e: React.MouseEvent) => {
            if (group.comingSoon && !hasSubmenu) {
              e.preventDefault();
              toast({ title: "This module will be available in the next build phase" });
              return;
            }
            if (group.path && !group.comingSoon) {
              navigate(group.path);
            }
          };

          return (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => hasSubmenu && setHoveredGroup(group.label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <button
                onClick={handleGroupClick}
                className={cn(
                  "flex items-center gap-3 h-12 w-full rounded-md px-3 text-sm font-medium transition-colors text-left",
                  active
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span>{group.label}</span>}
              </button>

              {/* Mega-menu panel */}
              {hasSubmenu && hoveredGroup === group.label && (
                <div
                  className={cn(
                    "absolute top-0 z-50 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[220px]",
                    collapsed ? "left-16" : "left-56"
                  )}
                >
                  <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.subItems!.map((sub) => {
                    const SubIcon = sub.icon;
                    const subActive = location.pathname.startsWith(sub.path);

                    const handleSubClick = (e: React.MouseEvent) => {
                      if (sub.comingSoon) {
                        e.preventDefault();
                        toast({ title: "This module will be available in the next build phase" });
                        return;
                      }
                      navigate(sub.path);
                      setHoveredGroup(null);
                    };

                    return (
                      <button
                        key={sub.path + sub.label}
                        onClick={handleSubClick}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left",
                          subActive && !sub.comingSoon
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted",
                          sub.comingSoon && "opacity-60"
                        )}
                      >
                        <SubIcon size={16} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span>{sub.label}</span>
                            {sub.comingSoon && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                Soon
                              </span>
                            )}
                          </div>
                          {sub.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate">{sub.subtitle}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom: user avatar + logout */}
      <div className="border-t border-sidebar-border px-3 py-3 flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-sidebar-accent text-white text-xs font-semibold">
            DR
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Dr. Ramesh</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">Admin</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="text-sidebar-foreground/60 hover:text-white transition-colors p-1 active:scale-95"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
