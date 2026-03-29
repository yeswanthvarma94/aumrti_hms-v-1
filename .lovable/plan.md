
## MRD Fix Plan

### What I found
1. **Header buttons are wired incorrectly**
   - In `src/pages/mrd/MRDPage.tsx`, **New Record Request** and **Death Certificate** only set modal state.
   - But those modals live inside inactive tab components (`RecordRequestsTab`, `DeathCertificatesTab`), so they are not mounted until that tab opens.
   - Result: it feels slow / broken because the button does not immediately open the workflow.

2. **Most MRD workflows have no source data**
   - Database currently has **OPD/IPD activity** (`opd_encounters`, `admissions`) but **0 rows** in:
     - `medical_records`
     - `icd_codings`
     - `death_certificates`
   - So ICD queue and records index are empty even though the hospital already has patients/visits.

3. **ICD AI suggestion is not actually reachable right now**
   - `ICDCodingTab.tsx` calls `callAI()` directly from the browser.
   - Current DB has AI configs, but **`api_configurations` is empty**, so there is no provider key for browser-side AI.
   - Also there is no dedicated `icd_coding` feature config seeded.
   - Result: even if a coding item existed, AI suggestion would fail.

4. **Death certificate generation is incomplete**
   - `DeathCertificatesTab.tsx` only inserts into `death_certificates`.
   - There is **no MCCD print/PDF generation** after save, and no reprint action from the list.

5. **Case bundle is only a checklist, not a real packet**
   - `CaseBundleModal.tsx` currently prints only a cover sheet/checklist.
   - It does **not** generate a real case summary bundle from admission/lab/radiology/billing/ICD data.

6. **Errors are often silent**
   - Several MRD fetch/update functions do not surface query errors clearly, so workflows appear “not working” instead of showing the real problem.

---

## Implementation plan

### 1) Make MRD actions open instantly
**Files**
- `src/pages/mrd/MRDPage.tsx`
- `src/components/mrd/RecordRequestsTab.tsx`
- `src/components/mrd/DeathCertificatesTab.tsx`

**Changes**
- Convert MRD tabs to a **controlled active tab**.
- Clicking **New Record Request** should:
  - switch to `requests`
  - open the request modal immediately
- Clicking **Death Certificate** should:
  - switch to `death`
  - open the certificate modal immediately
- Move shared MRD context loading (`hospitalId`, `currentUserId`) to `MRDPage` and pass it down, so tabs don’t all repeat auth/user lookups on mount.
- Add child → parent refresh callbacks so KPI cards update after create/approve/validate/generate actions.

### 2) Populate MRD records and ICD queue from real hospital activity
**Files**
- `supabase/migrations/...` (new migration)
- `src/components/opd/ConsultationWorkspace.tsx`
- `src/components/ipd/AdmitPatientModal.tsx`

**Changes**
- Add a migration to:
  - backfill `medical_records` from existing `opd_encounters` and `admissions`
  - backfill `icd_codings` from existing OPD/IPD visits
  - add safe uniqueness/indexing so these rows can be upserted without duplicates
- Going forward:
  - when an OPD encounter is created/saved, upsert the related `medical_records` + `icd_codings`
  - when an IPD admission is created, upsert the related `medical_records` + `icd_codings`

This fixes:
- Records Index empty
- ICD queue empty
- “Open pending item / clinical notes loaded” not working because there are no pending items

### 3) Fix ICD coding workflow end-to-end
**Files**
- `src/components/mrd/ICDCodingTab.tsx`
- `supabase/functions/...` (new ICD edge function)

**Changes**
- Keep the current queue/detail UI, but improve the left queue to show patient/visit context where possible.
- Replace direct browser `callAI()` usage with a **secure edge function** that uses `LOVABLE_API_KEY` server-side for ICD suggestions.
- Edge function will:
  - receive visit type + visit id + hospital id
  - load OPD/IPD clinical notes server-side
  - call the AI gateway
  - return structured JSON (`code`, `description`, `confidence`, reasoning)
- `ICDCodingTab` will:
  - auto-request suggestion when opening a pending item
  - persist `ai_suggestion` + `ai_confidence`
  - allow accept/prefill
  - keep `Validate & Finalise` updating status to `validated`

This fixes steps 4–7.

### 4) Complete death certificate workflow with printable MCCD
**Files**
- `src/components/mrd/DeathCertificatesTab.tsx`

**Changes**
- After saving a certificate, immediately generate a **printable MCCD view** (new window / print layout).
- Add **Print / Reprint** actions in the certificate table.
- Enrich certificate output with:
  - patient name/UHID
  - doctor name
  - time of death
  - causes 1a/1b/1c/II
  - manner / MLC
  - MCCD number / issue date
- If the selected patient has an active admission, auto-link `admission_id`.

This fixes step 8.

### 5) Make record request workflow reliable
**Files**
- `src/components/mrd/RecordRequestsTab.tsx`

**Changes**
- Use parent-provided context so modal opens immediately.
- Add proper loading/error toasts for create/approve/reject/fulfill operations.
- Refresh detail panel + KPI counters after each state change.
- Keep status transitions:
  - `pending` → `approved`
  - `approved` → `fulfilled`
  - `pending` → `rejected`

This fixes step 9.

### 6) Replace checklist-only bundle with real printable case packet
**Files**
- `src/components/mrd/CaseBundleModal.tsx`

**Changes**
- Keep checklist UI, but generate a **multi-section printable bundle** instead of only a cover page.
- Bundle sections should be built from real data:
  - admission summary
  - discharge summary/status
  - lab orders/results snapshot
  - radiology orders/reports snapshot
  - billing summary
  - ICD coding sheet
  - insurance/pre-auth summary when applicable
- Show section availability clearly and print only selected available sections.
- Add better empty states for unavailable sections.

This fixes step 10.

---

## Technical details
- I do **not** think this is mainly an “edge timeout” issue right now.
- The bigger root causes are:
  1. wrong tab/modal wiring
  2. MRD source tables not being populated
  3. ICD AI using a browser-side config path that currently has no API key data
  4. PDF workflows only partially implemented
- The fastest stable approach is:
  - **UI fix** for instant modal/tab behavior
  - **database backfill + ongoing upserts**
  - **server-side ICD AI edge function**
  - **printable HTML packet generation** for MCCD and bundle

## Files likely to change
1. `src/pages/mrd/MRDPage.tsx`
2. `src/components/mrd/ICDCodingTab.tsx`
3. `src/components/mrd/RecordRequestsTab.tsx`
4. `src/components/mrd/DeathCertificatesTab.tsx`
5. `src/components/mrd/CaseBundleModal.tsx`
6. `src/components/opd/ConsultationWorkspace.tsx`
7. `src/components/ipd/AdmitPatientModal.tsx`
8. `supabase/migrations/...` (backfill + dedupe/indexes)
9. `supabase/functions/...` (new ICD suggestion edge function)
