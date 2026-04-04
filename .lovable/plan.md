

## Replace OPD "Admit" Stub with Working IPD Admission

### Problem
The "Admit" button in ConsultationWorkspace shows a toast stub instead of opening the admission modal.

### Approach
The AdmitPatientModal already has its own patient search (Step 1) and bed selection. Rather than adding new props like `patientId`/`patientName`/`encounterId` (which would change the modal's interface used by IPDPage), we'll open the modal as-is and let the user confirm the patient in the modal's existing flow. This avoids modifying AdmitPatientModal.

However, to improve UX, we'll add optional `preselectedPatientId` and `preselectedPatientName` props to AdmitPatientModal so it can skip the search step when coming from OPD. This is a small, additive change.

### Changes

**File 1: `src/components/ipd/AdmitPatientModal.tsx`**
- Add two optional props to the Props interface: `preselectedPatientId?: string`, `preselectedPatientName?: string`
- In the component, accept these props
- Add a `useEffect`: if `preselectedPatientId` is provided on open, auto-fetch that patient from `patients` table and set as `selectedPatient`, then skip to step 2

**File 2: `src/components/opd/ConsultationWorkspace.tsx`**
- Import `AdmitPatientModal` from `@/components/ipd/AdmitPatientModal`
- Add state: `const [showAdmitModal, setShowAdmitModal] = useState(false)`
- Replace the stub toast on line 526 with: `onClick` that guards for `token?.patient_id`, then sets `setShowAdmitModal(true)`
- Render `AdmitPatientModal` before the closing `</div>` (line 549), passing:
  - `open={showAdmitModal}`
  - `onClose={() => setShowAdmitModal(false)}`
  - `hospitalId={hospitalId}`
  - `preselectedPatientId={token.patient_id}`
  - `preselectedPatientName={token.patient?.full_name}`
  - `onAdmitted` callback that closes modal, shows success toast, calls `onTokenUpdate()`

### Technical Details
- The `encounterId` linking (OPD encounter → IPD admission) is not currently supported by the admissions table schema, so we skip it for now rather than adding a prop that has no DB column to store it
- No existing logic in either file is changed — only the stub toast is replaced and optional props are added to the modal
- The existing IPDPage usage of AdmitPatientModal is unaffected (new props are optional)

