import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsBackupPage = () => (
  <SettingsPlaceholder
    icon="💾"
    title="Backup & Export"
    description="Export your data, download audit logs, and manage backups."
    fields={[
      { label: "Last Backup", value: "Today at 03:00 AM — Auto", type: "readonly" },
      { label: "Patient Data Export", value: "Download CSV — click Save to request", type: "readonly" },
      { label: "Audit Log", value: "Download — click Save to request", type: "readonly" },
      { label: "Full Data Export", value: "Processed in 24 hrs after request", type: "readonly" },
    ]}
  />
);
export default SettingsBackupPage;
