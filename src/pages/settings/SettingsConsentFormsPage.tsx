import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsConsentFormsPage = () => (
  <SettingsPlaceholder
    icon="📋"
    title="Consent Forms"
    description="Create and manage patient consent form templates."
    fields={[
      { label: "General Consent to Treatment", value: "Active ✓", type: "readonly" },
      { label: "Surgical Consent", value: "Active ✓", type: "readonly" },
      { label: "Anaesthesia Consent", value: "Active ✓", type: "readonly" },
    ]}
  />
);
export default SettingsConsentFormsPage;
