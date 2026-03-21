import React, { useState, useMemo } from "react";
import { RegistrationData, DESIGNATIONS } from "./constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  data: RegistrationData;
  onChange: (d: Partial<RegistrationData>) => void;
}

const Step2AdminAccount: React.FC<Props> = ({ data, onChange }) => {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => {
    const p = data.password;
    const checks = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    };
    const score = Object.values(checks).filter(Boolean).length;
    const labels = ["", "Weak", "Fair", "Strong", "Very Strong"];
    const colors = ["", "bg-destructive", "bg-accent", "bg-[hsl(160,84%,39%)]", "bg-[hsl(160,84%,25%)]"];
    return { checks, score, label: labels[score] || "", color: colors[score] || "" };
  }, [data.password]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold text-foreground">Create your admin account</h2>
        <p className="text-sm text-muted-foreground mt-1">You'll use this to log in and manage the system</p>
      </div>

      <div className="space-y-4 mt-8">
        <div>
          <Label>Your Full Name *</Label>
          <Input
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="Dr. Ramesh Kumar"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Work Email Address *</Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="admin@apollohospital.com"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">A verification email will be sent to this address</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Password *</Label>
            <div className="relative mt-1.5">
              <Input
                type={showPass ? "text" : "password"}
                value={data.password}
                onChange={(e) => onChange({ password: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {data.password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`flex-1 rounded-full transition-colors ${
                        seg <= strength.score ? strength.color : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                {strength.label && (
                  <p className="text-xs font-medium text-muted-foreground">{strength.label}</p>
                )}
                <div className="space-y-0.5">
                  {[
                    { key: "length", label: "At least 8 characters" },
                    { key: "upper", label: "One uppercase letter" },
                    { key: "number", label: "One number" },
                    { key: "special", label: "One special character (!@#$)" },
                  ].map((c) => (
                    <p
                      key={c.key}
                      className={`text-[11px] flex items-center gap-1.5 ${
                        strength.checks[c.key as keyof typeof strength.checks]
                          ? "text-[hsl(160,84%,39%)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {strength.checks[c.key as keyof typeof strength.checks] ? "✓" : "○"} {c.label}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Confirm Password *</Label>
            <div className="relative mt-1.5">
              <Input
                type={showConfirm ? "text" : "password"}
                value={data.confirmPassword}
                onChange={(e) => onChange({ confirmPassword: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {data.confirmPassword && data.confirmPassword !== data.password && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
        </div>

        <div>
          <Label>Your Designation *</Label>
          <Select value={data.designation} onValueChange={(v) => onChange({ designation: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select designation" /></SelectTrigger>
            <SelectContent>
              {DESIGNATIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default Step2AdminAccount;
