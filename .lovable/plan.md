

## Plan: IPD Discharge Workflow, Patient Record Deep Link, and Action Buttons

### Three Issues to Fix

**1. Full Discharge Workflow from IPD Overview**

Currently the Discharge Progress card only has a "Clear Billing" link. Need a complete step-by-step discharge process manageable from this screen.

**Changes to `src/components/ipd/tabs/IPDOverviewTab.tsx`:**
- Track 4 discharge steps with state: Medical Clearance, Billing, Pharmacy, Summary
- **Medical**: "Mark Medical Clearance" button → updates `admissions.medical_cleared = true`
- **Billing**: "Clear Billing →" navigates to billing (existing) — checks `billing_cleared` from admissions
- **Pharmacy**: "Clear Pharmacy →" checks if all dispensing is done (query `pharmacy_dispensing` for pending items) or marks cleared
- **Summary**: "Generate Discharge Summary" → triggers AI discharge summary generation + print
- Each step unlocks sequentially (step N+1 disabled until step N done)
- Add `medical_cleared` and `pharmacy_cleared` columns to admissions read (if not present, use local state with Supabase update)

**Changes to `src/components/ipd/IPDWorkspace.tsx` (Initiate Discharge button):**
- Instead of just sending WhatsApp, switch to Overview tab and highlight the discharge stepper
- The actual discharge status update (`admissions.status = 'discharged'`) happens at Step 4 completion

**2. View Patient Record — Open Specific Patient**

Currently navigates to `/patients?id={patientId}` but `PatientsPage` ignores the `?id=` query param.

**Changes to `src/pages/patients/PatientsPage.tsx`:**
- Read `id` from `useSearchParams()`
- On mount, if `id` param exists, fetch that specific patient and auto-open `PatientDetailDrawer`
- Clear the param after opening so subsequent navigation works normally

**3. Initiate Discharge, Transfer, Escalate Buttons Not Working**

Currently these just show toasts. Make them functional:

**Initiate Discharge** (`IPDWorkspace.tsx`):
- Switch to Overview tab and scroll to Discharge Progress card
- Set a flag to highlight the discharge stepper

**Transfer** (`IPDWorkspace.tsx`):
- Open a Transfer modal with: destination ward select, destination bed select, reason textarea
- On submit: update `admissions` with new ward/bed, update old bed status to `available`, new bed to `occupied`

**Escalate** (`IPDWorkspace.tsx`):
- Insert a `clinical_alert` record with severity `critical`, type `escalation`
- Show confirmation toast with details

### Technical Details

**New component:** `src/components/ipd/BedTransferModal.tsx`
- Ward dropdown (from `wards` table)
- Available bed dropdown (from `beds` where status = 'available' in selected ward)
- Reason textarea
- On confirm: update `admissions.ward_id`, `admissions.bed_id`, update both bed statuses

**Database reads/writes:**
- READ: `admissions`, `pharmacy_dispensing`, `wards`, `beds`, `patients`
- WRITE: `admissions` (medical_cleared, pharmacy_cleared, status, ward_id, bed_id), `beds` (status), `clinical_alerts`

**Files modified:**
1. `src/components/ipd/tabs/IPDOverviewTab.tsx` — full discharge stepper with 4 actionable steps
2. `src/components/ipd/IPDWorkspace.tsx` — wire up Initiate Discharge (tab switch), Transfer (modal), Escalate (alert insert)
3. `src/pages/patients/PatientsPage.tsx` — read `?id=` param and auto-open patient drawer
4. `src/components/ipd/BedTransferModal.tsx` — new transfer modal

