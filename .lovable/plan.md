-- recalculate_bill_totals function
CREATE OR REPLACE FUNCTION public.recalculate_bill_totals(p_bill_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
CREATE OR REPLACE FUNCTION public.trigger_recalculate_bill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_bill();

-- Token sequences table
CREATE TABLE IF NOT EXISTS token_sequences (
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  last_date TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (hospital_id, prefix)
);

ALTER TABLE token_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_sequences_hospital_isolation" ON token_sequences
  FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM users WHERE auth_user_id = auth.uid()));

-- generate_token_number RPC
CREATE OR REPLACE FUNCTION public.generate_token_number(p_hospital_id UUID, p_prefix TEXT DEFAULT 'A')
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today TEXT;
  v_next INTEGER;
  v_token TEXT;
BEGIN
  v_today := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');

  INSERT INTO token_sequences (hospital_id, prefix, last_number, last_date)
  VALUES (p_hospital_id, p_prefix, 1, v_today)
  ON CONFLICT (hospital_id, prefix) DO UPDATE
  SET
    last_number = CASE
      WHEN token_sequences.last_date = v_today THEN token_sequences.last_number + 1
      ELSE 1
    END,
    last_date = v_today
  RETURNING last_number INTO v_next;

  v_token := p_prefix || '-' || v_today || '-' || lpad(v_next::text, 4, '0');
  RETURN v_token;
END;
$$;