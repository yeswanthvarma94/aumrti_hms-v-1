import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsProtocolsPage = () => (
  <SettingsPlaceholder
    icon="📖"
    title="Clinical Protocols"
    description="Standard treatment protocols for emergency, nursing, and surgical care."
    fields={[
      { label: "Sepsis Bundle", value: "Active — Hour-1 Bundle (2021 SSC)", type: "readonly" },
      { label: "Code Blue", value: "Active — Cardiac arrest response protocol", type: "readonly" },
      { label: "Fall Prevention", value: "Active — Morse Fall Scale based", type: "readonly" },
      { label: "LAMA Protocol", value: "Active — Leave Against Medical Advice", type: "readonly" },
    ]}
  />
);
export default SettingsProtocolsPage;
