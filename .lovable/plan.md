

## Root Cause

`bill_line_items.source_record_id` is a **`uuid`** column, but `src/lib/ipdBilling.ts` is inserting prefixed strings into it:

| Block | Value being inserted | Valid UUID? |
|---|---|---|
| Pharmacy | `dispense-item:<uuid>` or `dispense:<id>:<drug>:<qty>` | No |
| Doctor visit | `visit:<doctorId>:<date>` | No |
| Room | `room:<admissionId>` | No |
| Sibling bill lines | `bill-line:<id>` | No |
| Sibling bill summaries | `bill-summary:<id>` | No |

That's why **Recalculate IPD Charges** fails with `invalid input syntax for type uuid: "dispense-item:..."`. The lab/radiology/nursing blocks happen to pass real UUIDs (`li.id`, `ro.id`, `np.id`), so they don't trigger the error — but as soon as a pharmacy item is in the mix, the whole insert is rejected.

The dedupe logic was relying on these composite string keys, but the database can't store them.

## Fix

Two clean options. Pick **Option A** (recommended) — keep the column as `uuid` (type-safe, no migration risk to existing rows) and change the code to:

1. Always pass a real UUID (or NULL) to `source_record_id`.
2. Move the composite "logical key" into a new **text** column `source_dedupe_key` used purely for deduplication.

### Step 1 — Migration: add `source_dedupe_key` to `bill_line_items`

```sql
ALTER TABLE public.bill_line_items
  ADD COLUMN IF NOT EXISTS source_dedupe_key text;

CREATE INDEX IF NOT EXISTS idx_bill_line_items_dedupe
  ON public.bill_line_items (bill_id, source_dedupe_key);
```

No data loss; existing rows simply have `NULL` here.

### Step 2 — Update `src/lib/ipdBilling.ts`

For every block, split into two fields:

| Block | `source_record_id` (uuid or null) | `source_dedupe_key` (text) |
|---|---|---|
| Lab | `li.id` | `lab:${li.id}` |
| Radiology | `ro.id` | `radiology:${ro.id}` |
| Pharmacy (item-level) | `item.id` (real uuid) | `pharmacy:dispense-item:${item.id}` |
| Pharmacy (header fallback) | `pd.id` | `pharmacy:dispense:${pd.id}:${drug}:${qty}` |
| Nursing | `np.id` | `nursing:${np.id}` |
| Doctor visit | `doctorId` (real uuid) | `ipd_visit:${doctorId}:${date}` |
| Room | `admissionId` | `ipd:room:${admissionId}` |
| Sibling bill line | `item.id` | `bill-line:${item.id}` |
| Sibling bill summary | `rb.id` | `bill-summary:${rb.id}` |

Update `toKey()` and the `existingKeys` set to read `source_dedupe_key` instead of building from `source_record_id`. Update the room-charge delete block to filter on `source_dedupe_key = 'ipd:room:<admissionId>'` instead of source_record_id.

Update the existing-items SELECT to fetch `source_dedupe_key` too.

### Step 3 — Backfill existing rows (optional, safe)

```sql
UPDATE public.bill_line_items
SET source_dedupe_key = source_module || ':' || source_record_id::text
WHERE source_dedupe_key IS NULL
  AND source_record_id IS NOT NULL
  AND source_module IS NOT NULL;
```

This prevents accidental duplicates on the next re-pull for bills that already have items.

### Step 4 — Verify

After the fix:
- Open Siva's IPD bill → click **Recalculate IPD Charges** → no error, totals refresh.
- Re-click → no duplicates added (dedupe via `source_dedupe_key` works).
- Room charge updates day-count correctly when re-pulled.

## Files Touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Add `source_dedupe_key text` + index + backfill |
| `src/lib/ipdBilling.ts` | Use real UUIDs in `source_record_id`; move composite keys to `source_dedupe_key`; update dedupe + room-delete logic |

## Why not just change the column to text?

That would also work, but `source_record_id` is referenced across many modules (auto-pull, leakage scanner, audit trails) as a UUID FK-style pointer. Keeping it `uuid` preserves type safety and the ability to JOIN it back to source tables. Adding a sibling text key is the smaller, safer change.

