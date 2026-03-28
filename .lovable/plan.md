

# Add Machine Management to Dialysis Module

## Problem
The Machine Board tab displays machines but provides no way to add, edit, or deactivate machines through the UI. Currently machines were only seeded via migration.

## Plan

### 1. Add "Add Machine" button to Machine Board header
- Place a `+ Add Machine` button in the top-right of `MachineBoardTab.tsx`
- Opens a dialog/modal form

### 2. Create Add Machine dialog
Fields:
- Machine Name (text, required)
- Model (text, e.g. "Fresenius 5008S")
- Machine Type (select: Clean, HBV, HCV, HIV, Universal — required)
- Location (text, optional)
- Status defaults to `available`
- `hospital_id` auto-set from current context
- `is_active` defaults to `true`

On save: insert into `dialysis_machines`, refresh the board.

### 3. Add edit/deactivate actions per machine card
- Small edit icon on each machine card → opens same form pre-filled
- "Deactivate" option → sets `is_active = false` (soft delete)
- Cannot deactivate if machine has an active session

### 4. Technical details
- All changes in `src/components/dialysis/MachineBoardTab.tsx`
- Reuses existing Supabase patterns with `(supabase as any).from("dialysis_machines")`
- RLS already applied via `hospital_id`
- Hospital ID sourced from existing machine data or system config

