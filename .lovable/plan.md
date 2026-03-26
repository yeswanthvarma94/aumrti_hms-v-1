

## Plan: Make Emergency Action Buttons Functional

### Problem
All action buttons in the Emergency workspace show placeholder toast messages ("coming in Phase 5") instead of performing real actions. The "Admit to IPD" button calls `handleDisposition` but doesn't navigate to the admission flow. "Discharge" works but provides no confirmation.

### Changes

**1. Update `src/components/emergency/EmergencyWorkspace.tsx`**

Add state for two modals and integrate existing components:

- **Admit to IPD**: Open the existing `AdmitPatientModal` (from `src/components/ipd/AdmitPatientModal.tsx`) with the patient pre-selected, then update disposition to "admitted" on success
- **STAT Lab**: Open the existing `NewLabOrderModal` (from `src/components/lab/NewLabOrderModal.tsx`) with priority set to "stat" and the patient context passed in
- **Blood Request**: Show a quick dialog form (blood group, units, component type, urgency) that inserts a record into a `blood_requests` table or, if that table doesn't exist, shows a structured toast confirming the request details and navigates to lab
- **Call Specialist**: Show a quick dialog to select department/specialty, then insert a `clinical_alerts` row with `alert_type = 'specialist_consult'` and the patient/visit details — this is a real notification
- **Discharge**: Add a confirmation dialog before calling `handleDisposition("discharged")` to prevent accidental discharges
- **MLC Register**: Navigate to a dedicated MLC view or show a summary dialog with MLC details

**2. Import existing modals**

- Import `AdmitPatientModal` and `NewLabOrderModal` into EmergencyWorkspace
- Add `showAdmitModal` and `showLabModal` state booleans
- Render the modals at the bottom of the component JSX

**3. Create specialist consult and blood request dialogs**

- Simple inline Dialog components within EmergencyWorkspace (no separate files needed)
- Specialist: dropdown for department, textarea for reason, "Send Alert" button that inserts into `clinical_alerts`
- Blood Request: blood group (auto-filled from patient if available), component type dropdown (Whole Blood, PRBCs, FFP, Platelets), units count, urgency toggle — inserts into `clinical_alerts` with type `blood_request`

**4. Add discharge confirmation**

- Use `AlertDialog` (already available in UI components) before executing discharge

### Technical Detail

All "actions" will use existing tables (`clinical_alerts` for specialist/blood alerts, `ipd_admissions` via AdmitPatientModal, `lab_orders` via NewLabOrderModal). No new tables or migrations needed. The `clinical_alerts` table already supports custom alert types and severity levels.

