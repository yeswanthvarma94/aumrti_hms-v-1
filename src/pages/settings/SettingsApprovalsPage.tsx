import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsApprovalsPage = () => (
  <SettingsPlaceholder
    icon="🛡️"
    title="Approval Rules"
    description="Set discount approval thresholds, clinical overrides, and purchase limits."
    fields={[
      { label: "Discount requires approval above", value: "5%" },
      { label: "Blood transfusion approval", value: "CMO required" },
      { label: "NDPS dispensing", value: "Dual pharmacist sign-off" },
    ]}
  />
);
export default SettingsApprovalsPage;
