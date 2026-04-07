## SQL Migration: Server-Side Bill Total Recalculation

### What it does
Creates a PostgreSQL function `recalculate_bill_totals(p_bill_id)` and a trigger on `bill_line_items` that auto-recalculates bill totals whenever line items are inserted, updated, or deleted.

### SQL
```sql
-- Server-side bill total recalculation function
CREATE OR REPLACE FUNCTION recalculate_bill_totals(p_bill_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_subtotal NUMERIC;
  v_gst NUMERIC;
  v_total NUMERIC;
  v_advance NUMERIC;
  v_insurance NUMERIC;
  v_paid NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(ROUND(taxable_amount::numeric, 2)), 0),
    COALESCE(SUM(ROUND(gst_amount::numeric, 2)), 0)
  INTO v_subtotal, v_gst
  FROM bill_line_items
  WHERE bill_id = p_bill_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_total := v_subtotal + v_gst;

  SELECT
    COALESCE(advance_received, 0),
    COALESCE(insurance_amount, 0),
    COALESCE(paid_amount, 0)
  INTO v_advance, v_insurance, v_paid
  FROM bills WHERE id = p_bill_id;

  UPDATE bills SET
    subtotal = v_subtotal,
    taxable_amount = v_subtotal,
    gst_amount = v_gst,
    total_amount = v_total,
    patient_payable = GREATEST(v_total - v_advance - v_insurance, 0),
    balance_due = GREATEST(v_total - v_advance - v_insurance - v_paid, 0),
    updated_at = now()
  WHERE id = p_bill_id;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION trigger_recalculate_bill()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_bill_totals(OLD.bill_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_bill_totals(NEW.bill_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_bill_line_items_recalc ON bill_line_items;
CREATE TRIGGER trg_bill_line_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON bill_line_items
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_bill();
```

### Why
- Bill totals are currently calculated client-side only — crash mid-save = stale totals
- Trigger ensures totals stay correct regardless of which module adds line items
- The `recalculate_bill_totals` RPC is also called explicitly as a fallback from client code
- Excludes soft-deleted items (`is_deleted = true`)

### Code changes already made
- Created `src/lib/currency.ts` with `roundCurrency()`, `calcGST()`, `formatINR()`
- Replaced all `Math.round(fee * gstPct / 100 * 100) / 100` with `calcGST()` across 10 files
- Replaced all client-side reduce-based recalculations with `supabase.rpc("recalculate_bill_totals")`
- All files compile cleanly with zero TypeScript errors