

## Fix Settings Hub Routing — Plan

### Problem
Clicking settings cards leads to 404 because most sub-routes have no page component. 9 routes already exist; 19 need placeholder pages.

### Already Working (no changes needed)
`/settings/profile`, `/settings/branding`, `/settings/departments`, `/settings/wards`, `/settings/staff`, `/settings/roles`, `/settings/services`, `/settings/drugs`, `/settings/whatsapp`

### Step 1: Create a reusable SettingsPlaceholder component

**File**: `src/pages/settings/SettingsPlaceholder.tsx`

A single shared component that accepts props: `icon`, `title`, `description`, and `fields` (array of label+value pairs). Renders the breadcrumb, back link, content card with icon, title, description, status badge, fields section, and disabled Save button -- exactly matching the spec layout.

Special handling for `/settings/modules` which needs toggle switches instead of text fields.

### Step 2: Create 19 placeholder page files

Each file is a thin wrapper around `SettingsPlaceholder`, passing the specific props from the spec. Files to create in `src/pages/settings/`:

| Route | File | Title |
|---|---|---|
| /settings/language | SettingsLanguagePage.tsx | Language & Region |
| /settings/plan | SettingsPlanPage.tsx | Plan & Billing |
| /settings/shifts | SettingsShiftsPage.tsx | Shift Configuration |
| /settings/modules | SettingsModulesPage.tsx | Modules On/Off |
| /settings/doctor-schedules | SettingsDoctorSchedulesPage.tsx | Doctor Schedules |
| /settings/lab-tests | SettingsLabTestsPage.tsx | Lab Test Master |
| /settings/consent-forms | SettingsConsentFormsPage.tsx | Consent Forms |
| /settings/ot-checklist | SettingsOTChecklistPage.tsx | OT Checklist Builder |
| /settings/protocols | SettingsProtocolsPage.tsx | Clinical Protocols |
| /settings/clinical-thresholds | SettingsClinicalThresholdsPage.tsx | Alert Thresholds |
| /settings/discharge-workflow | SettingsDischargeWorkflowPage.tsx | Discharge Workflow |
| /settings/approvals | SettingsApprovalsPage.tsx | Approval Rules |
| /settings/opd-workflow | SettingsOPDWorkflowPage.tsx | OPD Queue Config |
| /settings/notifications | SettingsNotificationsPage.tsx | Notification Config |
| /settings/report-schedules | SettingsReportSchedulesPage.tsx | Scheduled Reports |
| /settings/razorpay | SettingsRazorpayPage.tsx | Razorpay Payments |
| /settings/gst | SettingsGSTPage.tsx | GST / NIC IRP |
| /settings/abdm | SettingsABDMPage.tsx | ABDM / ABHA |
| /settings/backup | SettingsBackupPage.tsx | Backup & Export |
| /settings/api-keys | SettingsAPIKeysPage.tsx | API Keys |

**Optimization**: To avoid 19 near-identical files, each will be a ~15-line component importing `SettingsPlaceholder` and passing config. Alternatively, a single config-driven approach with one file defining all 19 configs and exporting named components.

### Step 3: Register all 19 routes in App.tsx

Add routes inside the `<Route element={<AppShell />}>` block, importing each placeholder page. No existing routes are modified.

### Step 4: Fix one card route mismatch

In `SettingsPage.tsx`, the "Notification Config" card points to `/settings/notifications` -- this needs its own placeholder (included above). All other card routes already match.

### Technical Notes
- No existing files are modified except `App.tsx` (adding imports + routes).
- `SettingsPage.tsx` card routes already match the target routes -- no href changes needed.
- All placeholder pages share the same layout via the reusable component.
- Estimated: ~22 new files (1 shared component + 19 page wrappers + route updates in App.tsx).

