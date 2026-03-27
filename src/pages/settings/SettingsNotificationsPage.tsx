import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsNotificationsPage = () => (
  <SettingsPlaceholder
    icon="🔔"
    title="Notification Config"
    description="Configure SMS, email, and push notification rules for your hospital."
    fields={[
      { label: "Appointment Reminder", value: "WhatsApp + SMS — 2 hours before", type: "readonly" },
      { label: "Lab Report Ready", value: "WhatsApp — Immediate", type: "readonly" },
      { label: "Discharge Summary", value: "Email + WhatsApp — On discharge", type: "readonly" },
      { label: "Bill Payment Receipt", value: "SMS — On payment", type: "readonly" },
    ]}
  />
);
export default SettingsNotificationsPage;
