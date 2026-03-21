import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  BedDouble,
  Activity,
  IndianRupee,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";

const stats = [
  { label: "Total Patients", value: "1,247", icon: Users, change: "+12 today" },
  { label: "Beds Occupied", value: "84 / 120", icon: BedDouble, change: "70% occupancy" },
  { label: "OPD Tokens", value: "38", icon: Activity, change: "Active today" },
  { label: "Revenue (MTD)", value: "₹18.4L", icon: IndianRupee, change: "+8.2% vs last month" },
  { label: "Doctors On Duty", value: "14", icon: Stethoscope, change: "3 on leave" },
  { label: "Critical Alerts", value: "2", icon: AlertTriangle, change: "Requires attention" },
];

const Dashboard: React.FC = () => {
  return (
    <div className="h-full p-6 overflow-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon size={20} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
