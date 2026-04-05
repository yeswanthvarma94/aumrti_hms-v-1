

## Fix: Roles Page — Cannot Create or Load Roles

### Root Cause

Two issues in `src/pages/settings/SettingsRolesPage.tsx`:

1. **Empty roles list for new hospitals**: The `role_permissions` query has no `hospital_id` filter. RLS likely blocks results, returning an empty list — which is what the screenshot shows (empty left panel).

2. **"+ Create" button fails silently**: The create mutation gets `hospitalId` from `roles[0]?.hospital_id`. When the roles list is empty (new hospital, no seeded roles), this is `undefined`, causing the mutation to throw `"No hospital"` and fail silently.

### Fix

**File: `src/pages/settings/SettingsRolesPage.tsx`**

1. Import `useHospitalId` hook
2. Add `const { hospitalId } = useHospitalId()` in the component
3. Add `.eq("hospital_id", hospitalId)` to the roles query + guard with `if (!hospitalId) return []`
4. Add `.eq("hospital_id", hospitalId)` to the staff counts query + same guard
5. In `createMutation`, replace `const hospitalId = (roles[0] as any)?.hospital_id` with the hook's `hospitalId`. Guard with `if (!hospitalId) throw new Error("No hospital")`
6. Add `hospitalId` to the `queryKey` arrays so queries refetch when hospital changes

### Technical Details
- The query currently returns empty because RLS scopes by hospital_id but the query fetches `*` without filtering — depending on RLS policy, this either returns nothing or cross-hospital data
- The create button's `onClick={() => createMutation.mutate()}` catches the error internally but shows no toast, so it fails silently
- After fix: roles load for the current hospital, and "Create" works even when no roles exist yet

### Files Changed
1. `src/pages/settings/SettingsRolesPage.tsx` — add hospital_id filtering and use `useHospitalId` hook

