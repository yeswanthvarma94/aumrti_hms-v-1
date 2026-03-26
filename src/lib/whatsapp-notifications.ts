/**
 * WhatsApp Notification Engine
 * Generates wa.me links with pre-filled messages for HMS events.
 * No WhatsApp Business API needed — just opens WhatsApp with structured text.
 */

export interface WhatsAppParams {
  phone: string;
  hospitalName: string;
  hospitalPhone?: string;
}

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
}

function openWhatsApp(phone: string, message: string) {
  const url = `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ── Appointment Reminder ──────────────────────────────────────

export function sendAppointmentReminder(
  params: WhatsAppParams & {
    patientName: string;
    doctorName: string;
    department?: string;
    appointmentDate: string;
    appointmentTime?: string;
    tokenNumber?: string;
  }
) {
  const msg = `🏥 *${params.hospitalName}*

Hello ${params.patientName} 👋

This is a reminder for your upcoming appointment:

📅 *Date:* ${params.appointmentDate}
${params.appointmentTime ? `🕐 *Time:* ${params.appointmentTime}` : ""}
👨‍⚕️ *Doctor:* Dr. ${params.doctorName}
${params.department ? `🏢 *Department:* ${params.department}` : ""}
${params.tokenNumber ? `🎫 *Token:* ${params.tokenNumber}` : ""}

Please arrive 15 minutes before your scheduled time.

For queries: ${params.hospitalPhone || "Contact hospital reception"}`;

  openWhatsApp(params.phone, msg);
}

// ── Bill Generated ────────────────────────────────────────────

export function sendBillNotification(
  params: WhatsAppParams & {
    patientName: string;
    billNumber: string;
    totalAmount: number;
    balanceDue: number;
    paymentLink?: string;
  }
) {
  const msg = `🏥 *${params.hospitalName}*

Dear ${params.patientName},

Your bill has been generated:

🧾 *Bill #:* ${params.billNumber}
💰 *Total Amount:* ₹${params.totalAmount.toLocaleString("en-IN")}
${params.balanceDue > 0 ? `⚠️ *Balance Due:* ₹${params.balanceDue.toLocaleString("en-IN")}` : "✅ *Fully Paid*"}
${params.paymentLink ? `\n💳 Pay online: ${params.paymentLink}` : ""}

For queries: ${params.hospitalPhone || "Contact billing counter"}`;

  openWhatsApp(params.phone, msg);
}

// ── Lab Report Ready ──────────────────────────────────────────

export function sendLabReportReady(
  params: WhatsAppParams & {
    patientName: string;
    testNames: string[];
    orderDate: string;
  }
) {
  const tests = params.testNames.slice(0, 5).join(", ");
  const msg = `🏥 *${params.hospitalName}*

Dear ${params.patientName},

Your lab results are ready! 🔬

📋 *Tests:* ${tests}
📅 *Order Date:* ${params.orderDate}

Please visit the hospital to collect your reports or view them on the patient portal.

For queries: ${params.hospitalPhone || "Contact hospital lab"}`;

  openWhatsApp(params.phone, msg);
}

// ── Discharge Summary ─────────────────────────────────────────

export function sendDischargeSummary(
  params: WhatsAppParams & {
    patientName: string;
    admissionDate: string;
    dischargeDate: string;
    diagnosis?: string;
    followUpDate?: string;
    instructions?: string;
  }
) {
  const msg = `🏥 *${params.hospitalName}*

Dear ${params.patientName},

You have been discharged. Here are your details:

📅 *Admitted:* ${params.admissionDate}
📅 *Discharged:* ${params.dischargeDate}
${params.diagnosis ? `🩺 *Diagnosis:* ${params.diagnosis}` : ""}
${params.followUpDate ? `📆 *Follow-up:* ${params.followUpDate}` : ""}
${params.instructions ? `\n📝 *Instructions:*\n${params.instructions}` : ""}

Please take your medications as prescribed. Wishing you a speedy recovery! 🙏

For queries: ${params.hospitalPhone || "Contact hospital"}`;

  openWhatsApp(params.phone, msg);
}

// ── Generic sender (for custom messages) ──────────────────────

export function sendCustomWhatsApp(phone: string, message: string) {
  openWhatsApp(phone, message);
}
