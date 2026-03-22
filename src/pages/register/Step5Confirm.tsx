import React from "react";
import { RegistrationData, BED_COUNTS } from "./constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone } from "lucide-react";

interface Props {
  data: RegistrationData;
  onChange: (d: Partial<RegistrationData>) => void;
  onEditStep: (step: number) => void;
  loading: boolean;
  onLaunch: () => void;
  otpPhase: "idle" | "sent" | "verifying";
  otp: string[];
  onOtpChange: (otp: string[]) => void;
}

const planLabels: Record<string, string> = {
  starter: "Starter — ₹8,999/mo",
  professional: "Professional — ₹18,999/mo",
  enterprise: "Enterprise — Custom",
};

const Step5Confirm: React.FC<Props> = ({ data, onChange, onEditStep, loading, onLaunch, otpPhase, otp, onOtpChange }) => {
  const bedLabel = BED_COUNTS.find((b) => b.value === data.bedCount)?.label || data.bedCount;

  const rows = [
    { label: "Hospital Name", value: data.hospitalName, step: 0 },
    { label: "Hospital Type", value: data.hospitalType, step: 0 },
    { label: "State", value: data.state, step: 0 },
    { label: "Beds", value: bedLabel, step: 0 },
    { label: "Admin Name", value: data.fullName, step: 1 },
    { label: "Admin Email", value: data.email, step: 1 },
    { label: "Mobile", value: data.phone, step: 0 },
    { label: "Plan", value: planLabels[data.plan] || data.plan, step: 3 },
    { label: "NABH", value: data.nabhAccredited ? `Yes — ${data.nabhNumber || "N/A"}` : "No", step: 2 },
    { label: "GSTIN", value: data.gstin || "Not provided", step: 2 },
  ];

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    onOtpChange(newOtp);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = e.currentTarget.previousElementSibling as HTMLInputElement | null;
      prev?.focus();
    }
  };

  const verifyTarget =
    data.verificationMethod === "email"
      ? data.email
      : data.phone;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold text-foreground">
          {otpPhase === "idle" ? "You're almost live! 🎉" : "Verify your account"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {otpPhase === "idle"
            ? "Review your details before we create your hospital account"
            : `Enter the 6-digit OTP sent to ${verifyTarget}`}
        </p>
      </div>

      {otpPhase !== "idle" ? (
        <div className="space-y-4 mt-6">
          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoFocus={i === 0}
                onChange={(e) => {
                  handleOtpInput(i, e.target.value);
                  if (e.target.value && e.target.nextElementSibling) {
                    (e.target.nextElementSibling as HTMLInputElement).focus();
                  }
                }}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-12 h-13 text-center text-xl font-semibold border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground"
              />
            ))}
          </div>
          {otpPhase === "verifying" && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">Creating your hospital account...</p>
          )}
          <button
            onClick={onLaunch}
            className="text-xs text-secondary hover:underline block mx-auto"
          >
            Resend OTP
          </button>
        </div>
      ) : (
        <>
          <div className="bg-muted/50 rounded-xl border border-border p-5 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {rows.map((row) => (
                <div key={row.label}>
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{row.value}</p>
                  <button
                    onClick={() => onEditStep(row.step)}
                    className="text-[11px] text-primary font-medium hover:underline mt-0.5"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Verification method chooser */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground mb-2">Verify your account via</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange({ verificationMethod: "email" })}
                className={`flex items-center gap-2.5 p-3.5 rounded-lg border-2 transition-colors text-left ${
                  data.verificationMethod === "email"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <Mail size={20} className={data.verificationMethod === "email" ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="text-sm font-medium text-foreground">Email OTP</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{data.email || "Not provided"}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onChange({ verificationMethod: "phone" })}
                className={`flex items-center gap-2.5 p-3.5 rounded-lg border-2 transition-colors text-left ${
                  data.verificationMethod === "phone"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <Phone size={20} className={data.verificationMethod === "phone" ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="text-sm font-medium text-foreground">Mobile OTP</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{data.phone || "Not provided"}</p>
                </div>
              </button>
            </div>
            {data.verificationMethod === "phone" && (
              <p className="text-xs text-amber-600 mt-2">
                📱 Mobile OTP requires Twilio SMS configuration in Supabase Auth settings.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 mt-6">
            <Checkbox
              id="terms"
              checked={data.termsAccepted}
              onCheckedChange={(v) => onChange({ termsAccepted: !!v })}
              className="mt-0.5"
            />
            <label htmlFor="terms" className="text-[13px] text-foreground leading-snug cursor-pointer">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
            </label>
          </div>

          <button
            onClick={onLaunch}
            disabled={!data.termsAccepted || loading}
            className="w-full mt-4 bg-primary text-primary-foreground py-3.5 rounded-lg text-base font-bold hover:bg-[hsl(220,54%,16%)] transition-colors disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
          >
            {loading ? "Sending OTP..." : "🚀 Launch My Hospital Account"}
          </button>
        </>
      )}
    </div>
  );
};

export default Step5Confirm;
