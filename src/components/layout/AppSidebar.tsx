import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  path?: string;
  subItems?: SubItem[];
}

const navGroups: NavGroup[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  {
    label: "Clinical",
    icon: Stethoscope,
    subItems: [
      { label: "OPD", path: "/opd", icon: Activity },
      { label: "IPD", path: "/ipd", icon: BedDouble },
      { label: "Emergency", path: "/emergency", icon: Siren },
      { label: "OT", path: "/ot", icon: Scissors },
      { label: "Nursing", path: "/nursing", icon: HeartPulse },
    ],
  },
  {
    label: "Diagnostics",
    icon: FlaskConical,
    subItems: [
      { label: "Lab", path: "/lab", icon: TestTube },
      { label: "Radiology", path: "/radiology", icon: ScanLine },
    ],
  },
  { label: "Pharmacy", icon: Pill, path: "/pharmacy" },
  {
    label: "Finance",
    icon: IndianRupee,
    subItems: [
      { label: "Billing", path: "/billing", icon: Receipt },
      { label: "Insurance", path: "/insurance", icon: Shield },
      { label: "Payments", path: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "More",
    icon: MoreHorizontal,
    subItems: [
      { label: "HR", path: "/hr", icon: Users },
      { label: "Inventory", path: "/inventory", icon: Package },
      { label: "Quality", path: "/quality", icon: Award },
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

          return (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => hasSubmenu && setHoveredGroup(group.label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              {group.path ? (
                <Link
                  to={group.path}
                  className={cn(
                    "flex items-center gap-3 h-12 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  {!collapsed && <span>{group.label}</span>}
                </Link>
              ) : (
                <button
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
              )}

              {/* Mega-menu panel */}
              {hasSubmenu && hoveredGroup === group.label && (
                <div
                  className={cn(
                    "absolute top-0 z-50 bg-card border border-border rounded-lg shadow-card-hover py-2 min-w-[180px]",
                    collapsed ? "left-16" : "left-56"
                  )}
                >
                  <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.subItems!.map((sub) => {
                    const SubIcon = sub.icon;
                    const subActive = location.pathname.startsWith(sub.path);
                    return (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          subActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <SubIcon size={16} />
                        <span>{sub.label}</span>
                      </Link>
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
