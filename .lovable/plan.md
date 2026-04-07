

## Final Cleanup — Stale Messages, Fees, MRD, Outstanding

### Already Done (skip)
- **Item 1 (stale toast)**: Line 547 already reads `Consultation complete for ${token.patient?.full_name || "patient"}` — no change needed.
- **Item 7 (NEWS2)**: Already implemented in `NursingVitalsTask.tsx` — `calcNEWS2()`, `news2_score` saved to `ipd_vitals`, clinical_alerts on score >= 5.

### Changes Required

**File 1: `src/pages/LandingPage.tsx`** — Replace demo video placeholder (line 190-192)
- Replace the "Demo video coming soon" placeholder with a product screenshot mockup showing the HMS dashboard and a "Request Demo" CTA button that opens a mailto or Calendly-style link.

**File 2: `src/pages/setup/steps/Step4Doctors.tsx`** — Fix placeholder email (line 75)
- Change `@placeholder.local` to `@hospital.local` for auto-generated doctor emails.

**File 3: `src/components/opd/ConsultationWorkspace.tsx`** — MRD retention period (line 440)
- Replace `3 * 365` with variable retention based on record context.
- OPD encounters: 3 years (1095 days) — current default, correct.
- Check if `token.is_mlc` or similar MLC flag exists; if MLC: 10 years (3650 days).
- Otherwise keep 3 years for OPD. IPD records are created in the IPD module, not here.

**File 4: `src/components/ipd/AdmitPatientModal.tsx`** — Insurance estimated_amount (line 232)
- Before inserting `insurance_pre_auth`, query `service_master` for a matching procedure/diagnosis fee.
- Use the admission diagnosis string to `ilike` search `service_master`.
- If found, use that fee as `estimated_amount`. If not, keep 0.

**File 5: `src/pages/billing/PaymentsPage.tsx`** — Outstanding calculation (lines 168-169)
- Add a `useEffect` that queries `bills` table: `SUM(balance_due)` WHERE `payment_status != 'paid'` AND `hospital_id = hospitalId`.
- Display the real total instead of the `—` placeholder.

**File 6: `src/components/ipd/tabs/IPDWardRoundTab.tsx`** — Consultant fee auto-capture (after line 137)
- After saving the ward round note successfully, check if `userId` (current doctor) differs from the admission's `admitting_doctor_id`.
- If different: query `service_master` for `consulting_opinion` fee (ilike `%consult%opinion%`), fallback ₹500.
- Create a `bill_line_item` on the patient's active IPD bill with `item_type: 'consultant_opinion'`.
- Fetch current doctor's name for the description.
- Toast: "Consultant opinion fee auto-captured: ₹X".
- Wrap in try/catch — non-blocking.

### Technical Notes
- NEWS2 alerting thresholds: the existing code uses >= 5 for clinical_alerts. The request asks for amber at >= 5 and red at >= 7. Add a toast distinction: amber toast for 5-6, destructive toast for >= 7. This is a small enhancement to `NursingVitalsTask.tsx`.
- No migration needed — `ipd_vitals.news2_score` column already exists (the insert at line 106 references it).

### Files Changed
1. `src/pages/LandingPage.tsx`
2. `src/pages/setup/steps/Step4Doctors.tsx`
3. `src/components/opd/ConsultationWorkspace.tsx`
4. `src/components/ipd/AdmitPatientModal.tsx`
5. `src/pages/billing/PaymentsPage.tsx`
6. `src/components/ipd/tabs/IPDWardRoundTab.tsx`
7. `src/components/nursing/NursingVitalsTask.tsx` (NEWS2 toast enhancement)

