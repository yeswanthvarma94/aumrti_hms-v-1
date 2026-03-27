import SettingsPlaceholder from "./SettingsPlaceholder";
const SettingsRazorpayPage = () => (
  <SettingsPlaceholder
    icon="💳"
    title="Razorpay Payments"
    description="Configure payment gateway for UPI, cards, and payment links."
    fields={[
      { label: "Razorpay Key ID", value: "rzp_live_••••••••••", type: "password" },
      { label: "Razorpay Key Secret", value: "••••••••••••••••", type: "password" },
      { label: "Payment Mode", value: "Live", type: "select" },
      { label: "UPI ID", value: "hospital@upi" },
    ]}
  />
);
export default SettingsRazorpayPage;
