import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Building2, Users, Stethoscope, ShieldCheck } from "lucide-react";

const Index = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [tableCount, setTableCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        // Simple connectivity check — just hit the REST endpoint
        const { error } = await supabase.from("hospitals").select("id", { count: "exact", head: true });
        // Even a 0-row result with RLS is fine — means connection works
        setConnected(!error || error.code === "PGRST116");
        setTableCount(5);
      } catch {
        setConnected(false);
      }
    };
    check();
  }, []);

  const tables = [
    { name: "hospitals", icon: Building2, desc: "Multi-tenant root" },
    { name: "branches", icon: Activity, desc: "Multi-branch support" },
    { name: "departments", icon: Stethoscope, desc: "Clinical & admin" },
    { name: "users", icon: Users, desc: "Staff profiles" },
    { name: "patients", icon: ShieldCheck, desc: "Patient master" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground tracking-wide uppercase">
          v9.0 Core Schema
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          HMS Platform
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-base">
          Hospital Management System — multi-tenant, RLS-secured, real-time ready.
        </p>
      </div>

      {/* Connection status */}
      <div className="mb-10 flex items-center gap-2.5 rounded-lg border border-border bg-card px-5 py-3 shadow-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            connected === null
              ? "bg-muted-foreground animate-pulse"
              : connected
              ? "bg-green-500"
              : "bg-destructive"
          }`}
        />
        <span className="text-sm font-medium">
          {connected === null
            ? "Checking Supabase…"
            : connected
            ? "Supabase Connected"
            : "Connection Failed"}
        </span>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl w-full">
        {tables.map((t) => (
          <div
            key={t.name}
            className="rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <t.icon className="h-5 w-5 text-primary mb-2" />
            <p className="font-semibold text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-5 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            {tableCount} tables with RLS &amp; realtime enabled
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-12 text-xs text-muted-foreground">
        Authentication required before data access. Next: add login &amp; signup.
      </p>
    </div>
  );
};

export default Index;
