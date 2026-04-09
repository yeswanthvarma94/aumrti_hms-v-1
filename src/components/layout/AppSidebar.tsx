import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  LayoutGrid,
  UserPlus,
  Stethoscope,
  BedDouble,
  FlaskConical,
  Pill,
  Receipt,
  BarChart3,
  Inbox,
  Settings,
  LogOut,
  HeartPulse,
  Activity,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const topItems: SidebarItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "All Modules", path: "/modules", icon: LayoutGrid },
  { label: "Patients", path: "/patients", icon: UserPlus },
];

// Default quick-access for super_admin / generic
const quickAccessItems: SidebarItem[] = [
  { label: "OPD Queue", path: "/opd", icon: Stethoscope },
  { label: "IPD / Wards", path: "/ipd", icon: BedDouble },
  { label: "Billing", path: "/billing", icon: Receipt },
  { label: "Govt Schemes", path: "/pmjay", icon: HeartPulse },
  { label: "Lab", path: "/lab", icon: FlaskConical },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

const recordsItems: SidebarItem[] = [
  { label: "Medical Records", path: "/mrd", icon: FolderOpen },
];

const bottomItems: SidebarItem[] = [
  { label: "Inbox", path: "/inbox", icon: Inbox },
  { label: "Settings", path: "/settings", icon: Settings },
];

const AppSidebar: React.FC = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("");
  const [userInitials, setUserInitials] = useState("U");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("full_name, role").eq("auth_user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setUserName(data.full_name || "User");
            setUserRole(data.role || "");
            const parts = (data.full_name || "U").split(" ");
            setUserInitials(parts.map((p: string) => p[0]).join("").toUpperCase().slice(0, 2));
          }
        });
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/login", { replace: true });
  };

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    const isModules = item.path === "/modules";

    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={cn(
          "flex items-center gap-3 h-10 w-full rounded-lg px-3 text-sm font-medium transition-colors text-left",
          active
            ? "bg-sidebar-accent text-white"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white",
          isModules && !active && "border border-sidebar-foreground/20"
        )}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-[56px] bottom-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Top items — fixed */}
      <nav className="flex-shrink-0 flex flex-col gap-1 px-2 pt-3">
        {topItems.map(renderItem)}
      </nav>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-sidebar-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Quick Access divider */}
        <div className="px-4 pt-5 pb-1">
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
              Quick Access
            </span>
          )}
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {quickAccessItems.map(renderItem)}
        </nav>

        {/* Records & Compliance */}
        <div className="px-4 pt-4 pb-1">
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
              Records
            </span>
          )}
        </div>
        <nav className="flex flex-col gap-1 px-2 pb-2">
          {recordsItems.map(renderItem)}
        </nav>
      </div>

      {/* Bottom items — fixed */}
      <nav className="flex-shrink-0 flex flex-col gap-1 px-2 pb-2">
        {bottomItems.map(renderItem)}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border px-3 py-3 flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-sidebar-accent text-white text-xs font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">{userRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="text-sidebar-foreground/60 hover:text-white transition-colors p-1 active:scale-95"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
