import React, { useState, useRef, useEffect } from "react";
import { RegistrationData, INDIAN_STATES, HOSPITAL_TYPES, BED_COUNTS } from "./constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: RegistrationData;
  onChange: (d: Partial<RegistrationData>) => void;
}

const Step1HospitalIdentity: React.FC<Props> = ({ data, onChange }) => {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = () => {
    if (!data.phone || data.phone.length < 10) return;
    setOtpSent(true);
    setCountdown(30);
    setOtp(["", "", "", ""]);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== "")) {
      onChange({ phoneVerified: true });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold text-foreground">Tell us about your hospital</h2>
        <p className="text-sm text-muted-foreground mt-1">This takes about 1 minute</p>
      </div>

      <div className="space-y-4 mt-8">
        <div>
          <Label>Hospital Name *</Label>
          <Input
            value={data.hospitalName}
            onChange={(e) => onChange({ hospitalName: e.target.value })}
            placeholder="e.g. Apollo General Hospital"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Hospital Type *</Label>
          <Select value={data.hospitalType} onValueChange={(v) => onChange({ hospitalType: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {HOSPITAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>State *</Label>
          <Select value={data.state} onValueChange={(v) => onChange({ state: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Approximate Bed Count *</Label>
          <Select value={data.bedCount} onValueChange={(v) => onChange({ bedCount: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select range" /></SelectTrigger>
            <SelectContent>
              {BED_COUNTS.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Your Mobile Number *</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value, phoneVerified: false })}
              placeholder="+91 98765 43210"
              className="flex-1"
            />
            {!data.phoneVerified && (
              <button
                onClick={handleSendOtp}
                disabled={!data.phone || data.phone.length < 10}
                className="shrink-0 border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Send OTP
              </button>
            )}
            {data.phoneVerified && (
              <span className="shrink-0 flex items-center gap-1 text-[hsl(160,84%,39%)] text-sm font-medium px-3">
                ✓ Verified
              </span>
            )}
          </div>

          {otpSent && !data.phoneVerified && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-11 text-center text-lg font-semibold border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {countdown > 0 ? `Resend in ${countdown}s` : (
                  <button onClick={handleSendOtp} className="text-secondary font-medium hover:underline">
                    Resend OTP
                  </button>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1HospitalIdentity;
