import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsPlanPage = () => (
  <SettingsPlaceholder
    icon="💳"
    title="Plan & Billing"
    description="View your current subscription plan, usage limits, and billing history."
    fields={[
      { label: "Current Plan", value: "HMS Pro — ₹12,000/month", type: "readonly" },
      { label: "Billing Cycle", value: "Monthly", type: "readonly" },
      { label: "Next Renewal", value: "1 April 2026", type: "readonly" },
      { label: "Modules Active", value: "29 / 39", type: "readonly" },
    ]}
  />
);
export default SettingsPlanPage;
