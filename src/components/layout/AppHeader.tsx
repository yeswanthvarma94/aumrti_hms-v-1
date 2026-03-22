import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/opd": "OPD",
  "/ipd": "IPD",
  "/emergency": "Emergency",
  "/ot": "OT",
  "/nursing": "Nursing",
  "/lab": "Lab",
  "/radiology": "Radiology",
  "/pharmacy": "Pharmacy",
  "/billing": "Billing",
  "/insurance": "Insurance",
  "/payments": "Payments",
  "/hr": "HR",
  "/inventory": "Inventory",
  "/quality": "Quality",
  "/settings": "Settings",
};

const AppHeader: React.FC = () => {
  const { toggle } = useSidebar();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentLabel = routeLabels[location.pathname] || "Page";
  const isHome = location.pathname === "/";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 gap-4">
        {/* Left: hamburger + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-muted transition-colors active:scale-95"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <Breadcrumb>
            <BreadcrumbList>
              {!isHome && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Center: search */}
        <div className="flex-1 flex justify-center max-w-md mx-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 w-full max-w-sm h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search size={16} />
            <span className="flex-1 text-left">Search patients, bills...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: status + notifications + user */}
        <div className="flex items-center gap-2">
          {/* Online/offline pill */}
          <div
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              online
                ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? "Online" : "Offline"}
          </div>

          {/* Notification bell */}
          <button className="relative p-2 rounded-md hover:bg-muted transition-colors active:scale-95">
            <Bell size={20} />
            <Badge className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground border-2 border-card rounded-full flex items-center justify-center">
              3
            </Badge>
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:ring-2 hover:ring-ring/20 transition-shadow">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    DR
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Hospital Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search patients, bills, doctors..."
            autoFocus
            className="h-11"
          />
          <p className="text-sm text-muted-foreground text-center py-6">
            Start typing to search across patients, bills, and doctors.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppHeader;
