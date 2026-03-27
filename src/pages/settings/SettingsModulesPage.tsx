import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsModulesPage = () => (
  <SettingsPlaceholder
    icon="🔧"
    title="Modules On/Off"
    description="Enable or disable individual HMS modules for your hospital."
    fields={[]}
    toggles={[
      { label: "OPD", defaultOn: true },
      { label: "IPD", defaultOn: true },
      { label: "Lab", defaultOn: true },
      { label: "Radiology", defaultOn: true },
      { label: "Pharmacy", defaultOn: true },
      { label: "Billing", defaultOn: true },
      { label: "Telemedicine", defaultOn: false },
      { label: "Dialysis", defaultOn: false },
    ]}
    extraNote="Changes take effect on next page load"
  />
);
export default SettingsModulesPage;
