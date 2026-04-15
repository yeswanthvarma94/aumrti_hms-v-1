

## Biomedical Equipment — Two Bugs

### Issue 1: Equipment Table Shows Empty ("No equipment found")

**Root Cause:** `EquipmentTab.tsx` line 45 — the `useEffect` has an empty dependency array `[]`. When the component mounts, `hospitalId` from `useHospitalId()` is likely still `null` (loading). The query runs with `null`, returns nothing, and never re-runs when `hospitalId` becomes available.

**Fix:** Add `hospitalId` to the dependency array and guard the fetch:

```typescript
// EquipmentTab.tsx line 35-45
useEffect(() => {
  if (!hospitalId) return;
  const load = async () => { ... };
  load();
}, [hospitalId]);
```

Same issue exists in `BiomedicalPage.tsx` — the KPI `useEffect` depends on `[refreshKey]` but not `hospitalId`. When it runs before `hospitalId` is available, the KPI queries return wrong data.

**Fix:** Add `hospitalId` to deps and guard:
```typescript
useEffect(() => {
  if (!hospitalId) return;
  const load = async () => { ... };
  load();
}, [refreshKey, hospitalId]);
```

### Issue 2: Equipment Code Shows Wrong Number (EQ-2026-018)

**Root Cause:** The code generation in `AddEquipmentModal.tsx` scans only codes matching `EQ-{year}-*` pattern. There are 3 such codes in the DB (EQ-2026-001, EQ-2026-016, EQ-2026-017), so max = 17, next = 018. But total equipment is 18 — the mismatch is because 15 older records use `EQ-001` to `EQ-015` format (no year). The code generation is actually correct for the new format, but the total count (18) doesn't match the sequence (018) by coincidence. The "wrong name" the user sees is that the code says 018 when there are only 18 total items — this is actually fine.

However, there's a UX issue: the code is generated on modal open, so if the user opens the modal, closes without saving, and opens again, it stays the same. This is acceptable. No code change needed here unless user clarifies a different issue.

### Changes

| File | Change |
|------|--------|
| `src/components/biomedical/EquipmentTab.tsx` | Add `hospitalId` to useEffect deps + guard |
| `src/pages/biomedical/BiomedicalPage.tsx` | Add `hospitalId` to KPI useEffect deps + guard |

