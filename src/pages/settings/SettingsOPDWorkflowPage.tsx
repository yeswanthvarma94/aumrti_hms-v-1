import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsOPDWorkflowPage = () => (
  <SettingsPlaceholder
    icon="🏥"
    title="OPD Queue Config"
    description="Token format, queue rules, vitals policy, and billing timing."
    fields={[
      { label: "Queue Type", value: "Token-based", type: "select" },
      { label: "Token Prefix", value: "A-" },
      { label: "Daily Reset", value: "Yes", type: "select" },
      { label: "Free Follow-up Window", value: "14 days" },
    ]}
  />
);
export default SettingsOPDWorkflowPage;
