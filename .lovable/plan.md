

## Patient Registration Page — `/patients`

### What We're Building
A dedicated Patient Registration page positioned in the sidebar between Dashboard and Clinical, providing a full-featured patient management view with search, registration, and patient list.

### Sidebar Change
Add a new top-level nav item **"Patients"** with `UserPlus` icon at index 1 (after Dashboard, before Clinical) in `AppSidebar.tsx`.

### Route
`/patients` inside `AppShell` routes in `App.tsx`.

### Page Layout — Single Full Page
Height: `calc(100vh - 56px)`, no page scroll.

**Header Bar (56px):**
- Left: "Patient Registry" title + total patient count badge
- Right: `[+ Register New Patient]` primary button → opens registration modal

**Search & Filter Bar (48px):**
- Search input (by name, phone, UHID) with debounced query
- Filter pills: All | Today | This Week | This Month

**Patient Table (fills remaining height, internally scrollable):**
- Columns: UHID | Name | Age/Gender | Phone | Blood Group | Last Visit | Actions
- Rows fetched from `patients` table, sorted by `created_at DESC`
- Click row → expands inline or opens detail drawer showing demographics, allergies, chronic conditions, visit history
- Actions column: View, Edit (inline modal)
- Empty state if no patients

**Registration Modal (reuse pattern from WalkInModal):**
- Full patient form: Name, Phone, Age, Gender, DOB, Blood Group, Address, Allergies, Chronic Conditions, Insurance ID, ABHA ID, Emergency Contact
- Auto-generates UHID on submit
- Inserts into `patients` table
- Toast on success, refreshes list

### Technical Details

**Files to create:**
1. `src/pages/patients/PatientsPage.tsx` — main page with search, table, modal state
2. `src/components/patients/PatientRegistrationModal.tsx` — full registration form
3. `src/components/patients/PatientDetailDrawer.tsx` — slide-out panel for patient details + visit history

**Files to edit:**
1. `src/App.tsx` — add `/patients` route inside AppShell
2. `src/components/layout/AppSidebar.tsx` — add "Patients" nav item between Dashboard and Clinical (line 46-47)
3. `src/components/layout/MobileTabBar.tsx` — no change needed (keep existing tabs)

**Queries:**
- Patient list: `SELECT * FROM patients WHERE hospital_id = [current] ORDER BY created_at DESC`
- Search: `WHERE full_name ILIKE '%q%' OR phone ILIKE '%q%' OR uhid ILIKE '%q%'`
- Visit history: `SELECT * FROM opd_encounters WHERE patient_id = [id] ORDER BY visit_date DESC LIMIT 5`
- Today filter: `WHERE created_at::date = CURRENT_DATE`

**No new tables needed** — uses existing `patients` table which already has all required columns.

