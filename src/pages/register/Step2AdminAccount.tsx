import React, { useState, useMemo } from "react";
import { RegistrationData, DESIGNATIONS } from "./constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: RegistrationData;
  onChange: (d: Partial<RegistrationData>) => void;
}

const Step2AdminAccount: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold text-foreground">Create your admin account</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll send an OTP to verify your email</p>
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
          <p className="text-xs text-muted-foreground mt-1">An OTP will be sent to verify this email during launch</p>
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
