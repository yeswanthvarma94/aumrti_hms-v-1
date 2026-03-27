/**
 * WhatsApp Send Engine — Level 2 (WATI auto-send with wa.me fallback)
 * 
 * Usage:
 *   import { sendWhatsApp } from "@/lib/whatsapp-send";
 *   await sendWhatsApp({ hospitalId, phone, message, notificationId });
 */

import { supabase } from "@/integrations/supabase/client";

interface SendOpts {
  hospitalId: string;
  phone: string;
  message: string;
  notificationId?: string;
}

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
}

/**
 * Attempts WATI API send if configured, falls back to wa.me deeplink.
 * Returns { method: "wati" | "wame", success: boolean }
 */
export async function sendWhatsApp(opts: SendOpts): Promise<{ method: "wati" | "wame"; success: boolean }> {
  const cleanedPhone = cleanPhone(opts.phone);

  // Check if WATI is configured for this hospital
  const { data: hospital } = await supabase
    .from("hospitals")
    .select("wati_api_url, whatsapp_enabled")
    .eq("id", opts.hospitalId)
    .single();

  const watiUrl = hospital?.wati_api_url;

  if (watiUrl && hospital?.whatsapp_enabled) {
    // ── WATI API path ──
    try {
      const response = await fetch(
        `${watiUrl}/api/v1/sendSessionMessage/${cleanedPhone}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messageText: opts.message }),
        }
      );

      if (response.ok) {
        // Update notification record
        if (opts.notificationId) {
          await supabase
            .from("whatsapp_notifications")
            .update({ sent_at: new Date().toISOString() } as any)
            .eq("id", opts.notificationId);
        }
        return { method: "wati", success: true };
      }

      // WATI failed — fall through to wa.me
      console.warn("WATI send failed, falling back to wa.me", response.status);
    } catch (err) {
      console.warn("WATI error, falling back to wa.me", err);
    }
  }

  // ── wa.me fallback ──
  const waUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(opts.message)}`;
  window.open(waUrl, "_blank");
  return { method: "wame", success: true };
}

/**
 * Check if a hospital has auto-send enabled for a trigger event.
 */
export async function shouldAutoSend(hospitalId: string, triggerEvent: string): Promise<boolean> {
  const { data: hospital } = await supabase
    .from("hospitals")
    .select("wati_api_url, whatsapp_enabled")
    .eq("id", hospitalId)
    .single();

  if (!hospital?.wati_api_url || !hospital?.whatsapp_enabled) return false;

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("auto_send, is_active")
    .eq("hospital_id", hospitalId)
    .eq("trigger_event", triggerEvent)
    .single();

  return !!(template?.is_active && template?.auto_send);
}
