import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsDischargeWorkflowPage = () => (
  <SettingsPlaceholder
    icon="🚪"
    title="Discharge Workflow"
    description="Configure the discharge checklist steps and approval requirements."
    fields={[
      { label: "Step 1", value: "Clinical Clearance — Treating doctor sign-off", type: "readonly" },
      { label: "Step 2", value: "Billing — Final bill settlement", type: "readonly" },
      { label: "Step 3", value: "Pharmacy — Return unused medicines", type: "readonly" },
      { label: "Step 4", value: "MRD Sign-off — Medical Records completion", type: "readonly" },
    ]}
  />
);
export default SettingsDischargeWorkflowPage;
