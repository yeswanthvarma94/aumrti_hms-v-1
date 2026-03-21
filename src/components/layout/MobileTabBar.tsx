import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Stethoscope, FlaskConical, Pill, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Clinical", icon: Stethoscope, path: "/opd" },
  { label: "Diagnostics", icon: FlaskConical, path: "/lab" },
  { label: "Pharmacy", icon: Pill, path: "/pharmacy" },
  { label: "More", icon: MoreHorizontal, path: "/settings" },
];

const MobileTabBar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;
        return (
          <Link
            key={tab.label}
            to={tab.path}
            className={cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-2 px-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon size={20} />
            <span className="mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
