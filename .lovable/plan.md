

## Fix: Radiology Modality Creation Path + Lab/Radiology Pricing

### Current State

1. **Radiology modalities**: The `radiology_modalities` table only has 4 types (X-Ray, USG, ECG, Echo). CT, MRI, DEXA are missing. There is **no settings page** to manage modalities — they were seeded directly in the DB.

2. **Lab test pricing**: The `lab_test_master` table has NO `fee` or `price` column. The `SettingsLabTestsPage` at `/settings/lab-tests` uses **mock data only** — not connected to Supabase at all.

3. **Radiology pricing**: Same problem — no `fee` column on `radiology_modalities` or `radiology_orders`. The `service_master` table has a "radiology" category and a "lab" category tab in `/settings/services`, but these are separate from the actual test/modality masters.

4. **Existing pricing path**: `/settings/services` (SettingsServicesPage) already has tabs for "Lab Tests" and "Radiology" in the `service_master` table, but these are disconnected from the actual `lab_test_master` and `radiology_modalities` tables used when creating orders.

### Plan

#### Part 1: Add `fee` columns to lab_test_master and radiology_modalities (Migration)

```sql
ALTER TABLE lab_test_master ADD COLUMN IF NOT EXISTS fee numeric DEFAULT 0;
ALTER TABLE radiology_modalities ADD COLUMN IF NOT EXISTS fee numeric DEFAULT 0;
```

#### Part 2: Seed missing radiology modalities (Data insert)

Insert CT, MRI, DEXA, Mammography, Fluoroscopy into `radiology_modalities` for hospital `8f3d08b3-8835-42a7-920e-fdf5a78260bc`.

#### Part 3: Fix SettingsLabTestsPage — connect to Supabase

**File: `src/pages/settings/SettingsLabTestsPage.tsx`**
- Remove mock data entirely
- Query `lab_test_master` from Supabase (with `hospital_id` filter)
- Add `fee` (₹) column to the table and add form
- Insert/update/toggle directly in Supabase
- Show actual test count

#### Part 4: Create SettingsRadiologyPage for modalities + pricing

**File: `src/pages/settings/SettingsRadiologyPage.tsx`** (NEW)
- CRUD for `radiology_modalities` table
- Fields: name, modality_type, fee, is_active
- Same pattern as SettingsLabTestsPage

**File: `src/App.tsx`** — Add route `/settings/radiology`

**File: `src/pages/settings/SettingsPage.tsx`** — Add "Radiology Modalities" card in Clinical group linking to `/settings/radiology`

#### Part 5: Auto-create modality on order (safety net)

**File: `src/components/radiology/NewRadiologyOrderModal.tsx`**
- When `modalities.find(m => m.modality_type === type)` returns null, auto-insert into `radiology_modalities` instead of blocking with error

### Navigation Paths After Fix

| What | Path |
|------|------|
| Manage radiology modalities + pricing | `/settings/radiology` (NEW) |
| Manage lab tests + pricing | `/settings/lab-tests` (existing, will be fixed) |
| Manage OPD/procedure fees | `/settings/services` (existing, unchanged) |

### Files Changed
1. **SQL migration** — Add `fee` column to `lab_test_master` and `radiology_modalities`
2. **Data insert** — Seed CT, MRI, DEXA, Mammography, Fluoroscopy modalities
3. `src/pages/settings/SettingsLabTestsPage.tsx` — Connect to Supabase, add fee column
4. `src/pages/settings/SettingsRadiologyPage.tsx` — NEW settings page for modalities
5. `src/App.tsx` — Add route for `/settings/radiology`
6. `src/pages/settings/SettingsPage.tsx` — Add card linking to radiology settings
7. `src/components/radiology/NewRadiologyOrderModal.tsx` — Auto-create missing modality

