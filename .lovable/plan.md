

## Plan: Fix Inventory Indents & GRN Performance and Missing Features

### Problems Identified

1. **Slow indent/GRN operations**: Both `submitNewIndent`, `updateStatus`, `issueItems`, and `submitGRN` use sequential `await` calls inside loops. Each item triggers 3-4 separate DB calls one after another.
2. **Issued tab not auto-switching**: After issuing items, the filter stays on the current tab instead of switching to "issued".
3. **No "rejected" tab**: The tabs array on line 180 is `["pending", "approved", "issued", "all"]` -- missing "rejected".
4. **GRN slow**: `submitGRN` runs sequential DB calls per item (grn_items insert, stock check, stock update, transaction insert, po_items update).

### Changes

**File: `src/components/inventory/IndentsPanel.tsx`**

1. **Add loading states** -- add `saving` boolean to disable buttons and show feedback during operations.
2. **Add "rejected" tab** -- change line 180 to include "rejected" in the tabs array.
3. **Auto-switch to correct tab after status change** -- after approve, switch filter to "approved"; after reject, switch to "rejected"; after issuing, switch to "issued".
4. **Batch indent item inserts** -- in `submitNewIndent`, replace the sequential loop with a single bulk `.insert([...allItems])` call.
5. **Batch issue operations** -- in `issueItems`, collect all update/insert payloads and use `Promise.all` for independent operations instead of sequential awaits.
6. **Optimistic UI** -- update the local `indents` state immediately on approve/reject instead of waiting for reload.

**File: `src/components/inventory/GRNPanel.tsx`**

7. **Add loading state** -- add `saving` boolean to disable the submit button during GRN creation.
8. **Batch GRN item inserts** -- insert all `grn_items` in a single bulk insert.
9. **Parallelize per-item operations** -- use `Promise.all` for stock updates, transaction logs, and PO item updates that are independent of each other.

### Technical Details

- Replace `for (const item of items) { await ...; }` patterns with `Promise.all(items.map(...))` where operations are independent.
- Bulk insert: `supabase.from("table").insert([item1, item2, ...])` instead of individual inserts per row.
- Loading state prevents double-clicks during slow operations.
- Tab auto-switch uses `setFilter(newStatus)` after status updates.

