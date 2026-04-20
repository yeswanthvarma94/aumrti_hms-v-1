/**
 * Standardised print header for ALL Aumrti HMS printed documents
 * (bills, prescriptions, discharge summaries, certificates, lab/radiology reports).
 *
 * Use this in any module that opens a print window so we get one consistent
 * letterhead across the hospital.
 */

import { supabase } from "@/integrations/supabase/client";

export interface HospitalPrintInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  emergency_phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  nabh_number?: string | null;
  logo_url?: string | null;
  website?: string | null;
}

/** Cache of hospital info (per page lifetime) so we don't re-query on every print. */
const cache = new Map<string, HospitalPrintInfo>();

export async function fetchHospitalPrintInfo(hospitalId: string): Promise<HospitalPrintInfo> {
  if (!hospitalId) return { name: "Hospital" };
  const cached = cache.get(hospitalId);
  if (cached) return cached;

  const { data } = await supabase
    .from("hospitals")
    .select("name, address, phone, emergency_phone, email, gstin, nabh_number, logo_url, website")
    .eq("id", hospitalId)
    .maybeSingle();

  const info: HospitalPrintInfo = data || { name: "Hospital" };
  cache.set(hospitalId, info);
  return info;
}

/** Escape HTML to keep printed letterheads injection-safe. */
function esc(v: string | null | undefined): string {
  if (!v) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Returns an HTML string for the standard letterhead (logo | hospital block | NABH badge).
 * Designed to be injected at the top of any print body.
 */
export function getHospitalPrintHeader(h: HospitalPrintInfo): string {
  const logoCell = h.logo_url
    ? `<img src="${esc(h.logo_url)}" alt="logo" style="max-height:64px;max-width:120px;object-fit:contain;" />`
    : `<div style="width:80px;height:64px;border:1px dashed #94a3b8;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;">LOGO</div>`;

  const contactLine = [
    h.phone ? `Phone: ${esc(h.phone)}` : "",
    h.emergency_phone ? `Emergency: ${esc(h.emergency_phone)}` : "",
    h.email ? `Email: ${esc(h.email)}` : "",
  ].filter(Boolean).join(" | ");

  const regLine = [
    h.gstin ? `GSTIN: ${esc(h.gstin)}` : "",
    h.nabh_number ? `NABH: ${esc(h.nabh_number)}` : "NABH Accredited ✓",
  ].filter(Boolean).join(" | ");

  const nabhBadge = `<div style="border:1.5px solid #1B3A6B;border-radius:6px;padding:6px 8px;text-align:center;display:inline-block;">
    <div style="font-size:9px;font-weight:700;color:#1B3A6B;letter-spacing:0.5px;">NABH</div>
    <div style="font-size:8px;color:#1B3A6B;margin-top:1px;">Accredited</div>
  </div>`;

  return `<div style="border-bottom:2px solid #1B3A6B;padding-bottom:12px;margin-bottom:16px;">
  <table width="100%" style="border-collapse:collapse;">
    <tr style="vertical-align:middle;">
      <td width="20%" style="padding:0;">${logoCell}</td>
      <td width="60%" align="center" style="padding:0 8px;">
        <h1 style="font-size:20px;margin:0;color:#1B3A6B;font-weight:700;letter-spacing:0.3px;">${esc(h.name)}</h1>
        ${h.address ? `<p style="margin:4px 0 0;font-size:11px;color:#334155;">${esc(h.address)}</p>` : ""}
        ${contactLine ? `<p style="margin:2px 0 0;font-size:11px;color:#334155;">${contactLine}</p>` : ""}
        ${regLine ? `<p style="margin:2px 0 0;font-size:11px;color:#334155;">${regLine}</p>` : ""}
      </td>
      <td width="20%" align="right" style="padding:0;">${nabhBadge}</td>
    </tr>
  </table>
</div>`;
}

/**
 * Convenience: fetch + render the header in one call.
 */
export async function buildHospitalPrintHeader(hospitalId: string): Promise<string> {
  const info = await fetchHospitalPrintInfo(hospitalId);
  return getHospitalPrintHeader(info);
}

/** Standard footer line for printed documents. */
export function getPrintFooter(emergencyPhone?: string | null): string {
  return `<div style="margin-top:24px;border-top:1px dashed #cbd5e1;padding-top:8px;font-size:10px;color:#64748b;text-align:center;">
    Computer-generated document — Powered by Aumrti HMS
    ${emergencyPhone ? `<br/>For emergencies, contact ${esc(emergencyPhone)}` : ""}
  </div>`;
}
