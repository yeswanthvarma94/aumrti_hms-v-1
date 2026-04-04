

## Add hospital_id Filters to 7 Page Files

### Problem
Seven pages query Supabase without `hospital_id` filters, leaking data across hospitals despite RLS.

### Changes per file

**1. `src/pages/cssd/CSSDPage.tsx`**
- Import `useHospitalId`, add `const { hospitalId } = useHospitalId()` in component
- `fetchKpis`: guard with `if (!hospitalId) return`, add `.eq("hospital_id", hospitalId)` to `instrument_sets` and `sterilization_cycles` queries
- Add `hospitalId` to `useEffect` dependency

**2. `src/pages/hr/HRPage.tsx`**
- Import `useHospitalId`, add hook call
- `loadKpis`: guard, add `.eq("hospital_id", hospitalId)` to `users`, `staff_attendance`, `staff_profiles` queries
- Add `hospitalId` to `useEffect` dependency

**3. `src/pages/insurance/InsurancePage.tsx`**
- Import `useHospitalId`, add hook call
- `loadKPIs`: guard, add `.eq("hospital_id", hospitalId)` to `insurance_pre_auth` and `insurance_claims` queries
- Add `hospitalId` to `useEffect` dependency

**4. `src/pages/ivf/IVFPage.tsx`**
- Import `useHospitalId`, add hook call
- `loadKPIs`: guard, add `.eq("hospital_id", hospitalId)` to `ivf_cycles`, `stimulation_monitoring`, `embryo_bank` queries
- Add `hospitalId` to `useEffect` dependency

**5. `src/pages/telemedicine/TelemedicinePage.tsx`**
- Import `useHospitalId`, add hook call
- `fetchSessions`: guard, add `.eq("hospital_id", hospitalId)` to `teleconsult_sessions` query
- Add `hospitalId` to `useCallback` dependency

**6. `src/pages/tv/TVDisplayPage.tsx`**
- Import `useHospitalId`, add hook call
- Replace line 66 `hospitals` query with: use `hospitalId` to fetch specific hospital via `.eq("id", hospitalId)`
- Add `.eq("hospital_id", hospitalId)` to `opd_tokens` and `departments` queries
- Guard `fetchTokens` with `if (!hospitalId) return`

**7. `src/pages/hod/HODDashboardPage.tsx`**
- Import `useHospitalId`, add hook call
- `fetchAll`: guard, add `.eq("hospital_id", hospitalId)` to all queries: `opd_tokens` (×8 in week loop + today + yesterday), `beds`, `bills`, `clinical_alerts`, `lab_order_items`, `staff_attendance`, `admissions`
- Add `hospitalId` to `useCallback` dependency

### Pattern applied uniformly
```typescript
import { useHospitalId } from "@/hooks/useHospitalId";
// inside component:
const { hospitalId } = useHospitalId();
// inside fetch function:
if (!hospitalId) return;
// on each query:
.eq("hospital_id", hospitalId)
```

No UI, structure, or business logic changes in any file.

