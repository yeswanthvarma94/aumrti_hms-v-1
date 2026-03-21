import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import MobileTabBar from "./MobileTabBar";
import { useIsMobile } from "@/hooks/use-mobile";

const ShellContent: React.FC = () => {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <AppHeader />
      {!isMobile && <AppSidebar />}

      <main
        className={cn(
          "mt-14 overflow-hidden transition-[margin-left] duration-200",
          isMobile ? "ml-0 h-[calc(100vh-56px-56px)]" : "",
          !isMobile && collapsed ? "ml-16 h-[calc(100vh-56px)]" : "",
          !isMobile && !collapsed ? "ml-60 h-[calc(100vh-56px)]" : ""
        )}
      >
        <div
          key={location.pathname}
          className="h-full w-full animate-in fade-in duration-150"
        >
          <Outlet />
        </div>
      </main>

      {isMobile && <MobileTabBar />}
    </div>
  );
};

const AppShell: React.FC = () => (
  <SidebarProvider>
    <ShellContent />
  </SidebarProvider>
);

export default AppShell;
