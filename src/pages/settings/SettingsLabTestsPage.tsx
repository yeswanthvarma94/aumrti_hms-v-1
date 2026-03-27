import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsLabTestsPage = () => (
  <SettingsPlaceholder
    icon="🔬"
    title="Lab Test Master"
    description="Manage your laboratory test catalog, reference ranges, and pricing."
    fields={[
      { label: "CBC — Complete Blood Count", value: "Haematology | TAT: 2 hrs | ₹450", type: "readonly" },
      { label: "LFT — Liver Function Test", value: "Biochemistry | TAT: 4 hrs | ₹650", type: "readonly" },
      { label: "KFT — Kidney Function Test", value: "Biochemistry | TAT: 4 hrs | ₹550", type: "readonly" },
      { label: "TSH — Thyroid Stimulating Hormone", value: "Endocrine | TAT: 6 hrs | ₹400", type: "readonly" },
      { label: "HbA1c", value: "Biochemistry | TAT: 4 hrs | ₹500", type: "readonly" },
    ]}
  />
);
export default SettingsLabTestsPage;
