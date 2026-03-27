import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsOTChecklistPage = () => (
  <SettingsPlaceholder
    icon="✅"
    title="OT Checklist Builder"
    description="Customise the WHO Surgical Safety Checklist for your hospital."
    fields={[
      { label: "Sign-In Phase", value: "Patient identity, site marking, consent, anaesthesia check", type: "readonly" },
      { label: "Time-Out Phase", value: "Team introduction, procedure confirm, antibiotics, imaging", type: "readonly" },
      { label: "Sign-Out Phase", value: "Instrument count, specimen labelling, recovery plan", type: "readonly" },
    ]}
  />
);
export default SettingsOTChecklistPage;
