

## Root Cause

In `src/lib/ipdBilling.ts` (line 328) the room-charge block selects:

```ts
.select("admitted_at, discharged_at, ward_id, wards(name, ward_type, rate_per_day), beds(bed_number)")
```

But the actual `wards` table has a column named **`type`** — not `ward_type`. Verified against schema:
```
wards: id, hospital_id, name, type, total_beds, is_active, created_at, rate_per_day
```

Effect: PostgREST silently nulls the embedded `wards` object (or returns `admission = null`), so:
- `wardDbRate = Number(undefined) || 0` → falls through to fallback `₹500/day`
- `wardName` becomes "Ward", `wardType` becomes "general" → service_master lookup useless

That's why every existing room line in the DB is `unit_rate = 500` regardless of the ward's actual `rate_per_day` (e.g. General Ward = ₹1,500). The **per-day quantity logic is correct** (3 days × 500 = 1500); the rate itself is just stuck at the fallback.

## Fix

### Single change in `src/lib/ipdBilling.ts`

Replace `ward_type` with `type` in the `select`, and update the destructure:

```ts
// before
"admitted_at, discharged_at, ward_id, wards(name, ward_type, rate_per_day), beds(bed_number)"
const wardType = (admission as any).wards?.ward_type || "general";

// after
"admitted_at, discharged_at, ward_id, wards(name, type, rate_per_day), beds(bed_number)"
const wardType = (admission as any).wards?.type || "general";
```

That's literally the only code change needed. After this, `wards.rate_per_day = 1500` will flow through and produce `quantity × 1500` line items.

### Backfill existing wrong room charges (one-time)

Existing draft IPD bills already have ₹500/day room rows. The "Recalculate IPD Charges" button already deletes & re-inserts the room line each run (the `delete where source_dedupe_key = ipd:room:<admissionId>` block), so once the code is fixed:

- For new bills: correct from the first auto-pull.
- For existing draft bills: clicking **Recalculate IPD Charges** once will replace the ₹500 row with the correct `rate_per_day` row.

No SQL migration required — but I will additionally run a one-time UPDATE to fix existing rows in-place so users don't have to click the button on every old bill:

```sql
UPDATE bill_line_items bli
SET unit_rate = w.rate_per_day,
    taxable_amount = w.rate_per_day * bli.quantity,
    total_amount = (w.rate_per_day * bli.quantity) +
                   ROUND((w.rate_per_day * bli.quantity) * (bli.gst_percent / 100.0), 2)
FROM bills b
JOIN admissions a ON a.id = b.admission_id
JOIN wards w ON w.id = a.ward_id
WHERE bli.bill_id = b.id
  AND bli.item_type = 'room_charge'
  AND b.bill_status = 'draft'
  AND w.rate_per_day > 0
  AND bli.unit_rate = 500;
```

Then the existing `recalculate_bill_totals` trigger on `bill_line_items` will refresh subtotals.

## Files Touched

| File | Change |
|---|---|
| `src/lib/ipdBilling.ts` | `ward_type` → `type` in select + destructure (2 lines) |
| New migration | One-time UPDATE to fix `unit_rate` on existing draft IPD room rows where ward's `rate_per_day` differs |

## Expected Result

- General Ward (rate 1500) × 3 days → ₹4,500 (was ₹1,500)
- ICU (whatever rate) × N days → correct
- Private Rooms (rate set in wards) × N days → correct
- "Recalculate IPD Charges" continues to work and now produces the right rate.

