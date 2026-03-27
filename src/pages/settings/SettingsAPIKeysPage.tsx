import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsAPIKeysPage = () => (
  <SettingsPlaceholder
    icon="🔑"
    title="API Keys"
    description="Generate API keys for developer integrations."
    fields={[
      { label: "API Key", value: "hms_live_••••••••••••••••", type: "password" },
      { label: "Created", value: "15 Jan 2026", type: "readonly" },
      { label: "Last Used", value: "Today", type: "readonly" },
    ]}
  />
);
export default SettingsAPIKeysPage;
