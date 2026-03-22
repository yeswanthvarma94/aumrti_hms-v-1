import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  Building2,
  BedDouble,
  Receipt,
  Pill,
  Hospital,
} from "lucide-react";

const cards = [
  {
    icon: UserPlus,
    title: "Doctors & Staff",
    desc: "Add doctors, nurses, billing staff and other users",
    route: "/settings/staff",
    table: "users" as const,
  },
  {
    icon: Building2,
    title: "Departments",
    desc: "Manage hospital departments and specialties",
    route: "/settings/departments",
    table: "departments" as const,
  },
  {
    icon: BedDouble,
    title: "Wards & Beds",
    desc: "Configure wards, bed count and bed categories",
    route: "/settings/wards",
    table: "beds" as const,
  },
  {
    icon: Receipt,
    title: "Services & Fees",
    desc: "OPD fees, procedures, packages and service rates",
    route: "/settings/services",
    table: "service_master" as const,
  },
  {
    icon: Pill,
    title: "Drug Master",
    desc: "Manage pharmacy drug list and formulary",
    route: "/settings/drugs",
    table: "drug_master" as const,
  },
  {
    icon: Hospital,
    title: "Hospital Profile",
    desc: "Name, address, logo, brand color, GSTIN",
    route: "/settings/profile",
    table: null,
  },
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: counts } = useQuery({
    queryKey: ["settings-counts"],
    queryFn: async () => {
      const tables = ["users", "departments", "beds", "service_master", "drug_master"] as const;
      const results = await Promise.all(
        tables.map((t) =>
          supabase.from(t).select("id", { count: "exact", head: true })
        )
      );
      return {
        users: results[0].count ?? 0,
        departments: results[1].count ?? 0,
        beds: results[2].count ?? 0,
        service_master: results[3].count ?? 0,
        drug_master: results[4].count ?? 0,
      } as Record<string, number>;
    },
  });

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-5 pb-2">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage your hospital configuration
        </p>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 pt-2">
        <div className="grid grid-cols-3 gap-4 h-full">
          {cards.map((card) => {
            const Icon = card.icon;
            const count = card.table && counts ? counts[card.table] : null;

            return (
              <button
                key={card.route}
                onClick={() => navigate(card.route)}
                className="bg-card border border-border rounded-xl p-5 text-left cursor-pointer hover:border-[hsl(222,55%,23%)] hover:shadow-md transition-all duration-150 flex flex-col active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon size={20} className="text-foreground" />
                  </div>
                  {count !== null && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(220,80%,96%)] text-[hsl(222,55%,23%)] font-medium">
                      {count}
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-foreground mt-3">
                  {card.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
