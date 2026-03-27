import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsGSTPage = () => (
  <SettingsPlaceholder
    icon="📄"
    title="GST / NIC IRP"
    description="Configure GST e-Invoice settings and NIC IRP integration."
    fields={[
      { label: "Hospital GSTIN", value: "29AABCT1332L1ZX" },
      { label: "State Code", value: "29 — Karnataka" },
      { label: "NIC IRP Username", value: "Enter username..." },
      { label: "NIC IRP Password", value: "••••••••", type: "password" },
      { label: "e-Invoice Mode", value: "Sandbox", type: "select" },
    ]}
  />
);
export default SettingsGSTPage;
