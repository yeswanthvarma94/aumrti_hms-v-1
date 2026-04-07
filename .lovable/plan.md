

## Fix: Missing Database Functions Breaking All Billing

### Root Cause
The `recalculate_bill_totals` PostgreSQL function is called in **5 files** but was **never created as a migration**. Every billing operation that inserts line items then calls this RPC to update the bill total — and it silently fails, leaving all bills at ₹0.

The `generate_token_number` RPC also has no migration (WalkInModal has a fallback, but tokens may have gaps).

### What the User Sees
- Bills created with ₹0 total (screenshot shows IPD bill for "Suresh" with zero amounts)
- "Settled" label appears because balance_due = 0 (since total = 0)
- But payment_status shows "Unpaid" — contradicting the "Settled" display
- All module billing (OT, Nursing, Lab, Radiology, Pharmacy charges) silently fails to update totals

### Fix Plan

#### Step 1: SQL Migration — Create recalculate_bill_totals function + trigger

Create a migration with:
1. `recalculate_bill_totals(p_bill_id UUID)` function — sums non-deleted line items, calculates subtotal/GST/total/patient_payable/balance_due
2. `trigger_recalculate_bill()` trigger function
3. `trg_bill_line_items_recalc` trigger on `bill_line_items` table (AFTER INSERT/UPDATE/DELETE)

This ensures bill totals are always correct, even if the explicit RPC call fails.

#### Step 2: SQL Migration — Create generate_token_number function

Create `generate_token_number(p_hospital_id UUID, p_prefix TEXT)` using the same atomic pattern as `generate_bill_number` but for OPD tokens. Uses a `token_sequences` table.

#### Step 3: Add error handling to RPC calls

In these 5 files, wrap `recalculate_bill_totals` RPC calls in try/catch with toast on failure:
- `src/pages/billing/BillingPage.tsx` (line 337)
- `src/components/billing/BillEditor.tsx` (line 233)
- `src/components/ot/EndCaseModal.tsx` (line 171)
- `src/components/nursing/NursingProcedureModal.tsx` (line 90)
- `src/lib/investigationBilling.ts` (line 87)

The trigger will handle recalculation automatically, but the explicit RPC call serves as a belt-and-suspenders approach.

#### Step 4: Client-side fallback totals

In `BillEditor.tsx` line 231-235, after the RPC call, add a client-side fallback that manually updates the bill totals if the RPC fails — using a direct UPDATE on the bills table with calculated values from the line items already fetched.

### Technical Details

**recalculate_bill_totals function:**
```sql
CREATE OR REPLACE FUNCTION recalculate_bill_totals(p_bill_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_subtotal NUMERIC; v_gst NUMERIC; v_total NUMERIC;
  v_advance NUMERIC; v_insurance NUMERIC; v_paid NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ROUND(taxable_amount::numeric, 2)), 0),
         COALESCE(SUM(ROUND(gst_amount::numeric, 2)), 0)
  INTO v_subtotal, v_gst
  FROM bill_line_items
  WHERE bill_id = p_bill_id AND (is_deleted IS NULL OR is_deleted = false);
  
  v_total := v_subtotal + v_gst;
  
  SELECT COALESCE(advance_received, 0), COALESCE(insurance_amount, 0), COALESCE(paid_amount, 0)
  INTO v_advance, v_insurance, v_paid
  FROM bills WHERE id = p_bill_id;
  
  UPDATE bills SET
    subtotal = v_subtotal, taxable_amount = v_subtotal,
    gst_amount = v_gst, total_amount = v_total,
    patient_payable = GREATEST(v_total - v_advance - v_insurance, 0),
    balance_due = GREATEST(v_total - v_advance - v_insurance - v_paid, 0),
    updated_at = now()
  WHERE id = p_bill_id;
END; $$;
```

**Trigger:**
```sql
CREATE OR REPLACE FUNCTION trigger_recalculate_bill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_bill_totals(OLD.bill_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_bill_totals(NEW.bill_id);
    RETURN NEW;
  END IF;
END; $$;

CREATE TRIGGER trg_bill_line_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON bill_line_items
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_bill();
```

**generate_token_number:**
```sql
CREATE TABLE IF NOT EXISTS token_sequences (
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  prefix TEXT NOT NULL, last_number INTEGER DEFAULT 0,
  last_date TEXT DEFAULT '', PRIMARY KEY (hospital_id, prefix)
);
-- + RPC function same pattern as generate_bill_number
```

### Files Changed
1. New SQL migration (recalculate_bill_totals + trigger + generate_token_number + token_sequences)
2. `src/pages/billing/BillingPage.tsx` — try/catch on RPC
3. `src/components/billing/BillEditor.tsx` — try/catch + client-side fallback
4. `src/components/ot/EndCaseModal.tsx` — try/catch on RPC
5. `src/components/nursing/NursingProcedureModal.tsx` — try/catch on RPC
6. `src/lib/investigationBilling.ts` — try/catch on RPC

### Impact
This single migration fixes ALL billing across every module — OPD, IPD, OT, Lab, Radiology, Pharmacy, Nursing, Dialysis, Physio, Dental, AYUSH, Vaccination, IVF, Oncology, Blood Bank, Telemedicine. Every module that inserts bill_line_items will have totals automatically recalculated by the trigger.

