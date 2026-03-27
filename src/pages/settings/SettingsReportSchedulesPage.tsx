import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsReportSchedulesPage = () => (
  <SettingsPlaceholder
    icon="📅"
    title="Scheduled Reports"
    description="Auto-generate and email reports on a schedule."
    fields={[
      { label: "Daily Collection Report", value: "Every day at 08:00 AM — CEO", type: "readonly" },
      { label: "Weekly Revenue Report", value: "Every Monday at 09:00 AM — CFO", type: "readonly" },
      { label: "Monthly NABH Report", value: "1st of month — Quality Manager", type: "readonly" },
    ]}
  />
);
export default SettingsReportSchedulesPage;
