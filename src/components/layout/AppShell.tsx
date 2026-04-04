import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import MobileTabBar from "./MobileTabBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { VoiceScribeProvider } from "@/contexts/VoiceScribeContext";
import VoiceScribePanel from "@/components/voice/VoiceScribePanel";
import CommandPalette from "./CommandPalette";

const ShellContent: React.FC = () => {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <AppHeader />
      {!isMobile && <AppSidebar />}
      <CommandPalette />

      <main
        className={cn(
          "mt-14 overflow-hidden transition-[margin-left] duration-200",
          isMobile ? "ml-0 h-[calc(100vh-56px-56px)]" : "",
          !isMobile && collapsed ? "ml-16 h-[calc(100vh-56px)]" : "",
          !isMobile && !collapsed ? "ml-56 h-[calc(100vh-56px)]" : ""
        )}
      >
        <div
          key={location.pathname}
          className="h-full w-full animate-in fade-in duration-150"
        >
          <Suspense fallback={
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {isMobile && <MobileTabBar />}
      <VoiceScribePanel />
    </div>
  );
};

const AppShell: React.FC = () => (
  <VoiceScribeProvider>
    <SidebarProvider>
      <ShellContent />
    </SidebarProvider>
  </VoiceScribeProvider>
);

export default AppShell;
