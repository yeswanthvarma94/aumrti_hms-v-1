import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsShiftsPage = () => (
  <SettingsPlaceholder
    icon="🕐"
    title="Shift Configuration"
    description="Define morning, evening, and night shifts. Set durations and overtime rules."
    fields={[
      { label: "Morning Shift", value: "07:00 — 15:00" },
      { label: "Evening Shift", value: "15:00 — 23:00" },
      { label: "Night Shift", value: "23:00 — 07:00" },
      { label: "General Shift", value: "09:00 — 17:00" },
    ]}
  />
);
export default SettingsShiftsPage;
