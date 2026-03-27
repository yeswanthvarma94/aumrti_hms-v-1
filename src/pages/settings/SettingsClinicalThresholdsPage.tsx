import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsClinicalThresholdsPage = () => (
  <SettingsPlaceholder
    icon="🚨"
    title="Alert Thresholds"
    description="Configure critical value thresholds for labs, vitals, and clinical alerts."
    fields={[
      { label: "Potassium Critical High", value: "6.5 mEq/L" },
      { label: "Haemoglobin Critical Low", value: "7.0 g/dL" },
      { label: "NEWS2 Escalation Score", value: "5" },
      { label: "Sepsis Alert", value: "SIRS criteria met" },
    ]}
  />
);
export default SettingsClinicalThresholdsPage;
