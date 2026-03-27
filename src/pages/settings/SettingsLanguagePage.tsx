import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsLanguagePage = () => (
  <SettingsPlaceholder
    icon="🌐"
    title="Language & Region"
    description="Set the interface language, date/time format, and currency for your hospital."
    fields={[
      { label: "Interface Language", value: "English (India)", type: "select" },
      { label: "Date Format", value: "DD/MM/YYYY", type: "select" },
      { label: "Time Format", value: "12-hour (AM/PM)", type: "select" },
      { label: "Currency", value: "Indian Rupee (₹)", type: "select" },
      { label: "Timezone", value: "Asia/Kolkata (IST)", type: "select" },
    ]}
  />
);
export default SettingsLanguagePage;
