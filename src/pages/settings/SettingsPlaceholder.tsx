import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface PlaceholderField {
  label: string;
  value: string;
  type?: "text" | "select" | "password" | "readonly" | "toggle";
}

interface SettingsPlaceholderProps {
  icon: string;
  title: string;
  description: string;
  fields: PlaceholderField[];
  toggles?: { label: string; defaultOn: boolean }[];
  extraNote?: string;
}

const SettingsPlaceholder: React.FC<SettingsPlaceholderProps> = ({
  icon,
  title,
  description,
  fields,
  toggles,
  extraNote,
}) => {
  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-muted/30" style={{ padding: "40px 32px" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Link to="/settings" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft size={12} />
          Settings
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{title}</span>
      </div>

      {/* Content Card */}
      <div
        className="bg-card border border-border rounded-2xl mt-6"
        style={{ padding: "40px", maxWidth: 600 }}
      >
        {/* Icon */}
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <span className="text-[28px]">{icon}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mt-4">{title}</h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>

        {/* Status badge */}
        <div className="mt-4">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1"
            style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
          >
            🔧 Configuration available
          </span>
        </div>

        {/* Fields */}
        <div className="mt-7 space-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <label className="text-xs font-bold text-foreground block mb-1.5">{f.label}</label>
              {f.type === "password" ? (
                <Input type="password" defaultValue={f.value} readOnly className="bg-muted/50" />
              ) : f.type === "readonly" ? (
                <Input defaultValue={f.value} readOnly className="bg-muted/50 text-muted-foreground" />
              ) : f.type === "select" ? (
                <Input defaultValue={f.value} readOnly className="bg-muted/50 cursor-default" />
              ) : (
                <Input defaultValue={f.value} readOnly className="bg-muted/50" />
              )}
            </div>
          ))}
        </div>

        {/* Toggles (for modules page) */}
        {toggles && toggles.length > 0 && (
          <div className="mt-7">
            <div className="grid grid-cols-2 gap-3">
              {toggles.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5"
                >
                  <span className="text-sm text-foreground">{t.label}</span>
                  <Switch defaultChecked={t.defaultOn} disabled />
                </div>
              ))}
            </div>
            {extraNote && (
              <p className="text-xs text-muted-foreground mt-3 italic">{extraNote}</p>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="mt-7">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled
                className="h-11 px-8"
                style={{ backgroundColor: "#1A2F5A", color: "white", opacity: 0.6 }}
              >
                Save Changes
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Full configuration in next update</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default SettingsPlaceholder;
