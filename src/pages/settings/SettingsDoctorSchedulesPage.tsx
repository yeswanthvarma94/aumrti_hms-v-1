import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsDoctorSchedulesPage = () => (
  <SettingsPlaceholder
    icon="📅"
    title="Doctor Schedules"
    description="Configure OPD timings, consultation slots, and leave blocks for doctors."
    fields={[
      { label: "Default Slot Duration", value: "15 minutes", type: "select" },
      { label: "Max Slots per Session", value: "20", type: "select" },
      { label: "Booking Window", value: "30 days ahead", type: "select" },
      { label: "Auto-cancel No-show After", value: "15 minutes", type: "select" },
    ]}
  />
);
export default SettingsDoctorSchedulesPage;
