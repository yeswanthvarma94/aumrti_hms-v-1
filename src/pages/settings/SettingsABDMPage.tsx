import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsABDMPage = () => (
  <SettingsPlaceholder
    icon="🏛️"
    title="ABDM / ABHA"
    description="Configure ABDM Health Information Provider (HIP) and ABHA integration."
    fields={[
      { label: "ABDM Client ID", value: "Enter Client ID..." },
      { label: "ABDM Client Secret", value: "••••••••••", type: "password" },
      { label: "HIP ID", value: "Enter HIP ID..." },
      { label: "Facility Name", value: "Auto-filled from hospital name", type: "readonly" },
    ]}
  />
);
export default SettingsABDMPage;
