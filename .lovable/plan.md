## SQL Migration: Soft Delete + Prescription History

### 1. Add soft delete columns to bill_line_items
```sql
ALTER TABLE bill_line_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE bill_line_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bill_line_items ADD COLUMN IF NOT EXISTS deleted_by UUID;
```

### 2. Add is_active column to duty_roster
```sql
ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 3. Create prescription_history table
```sql
CREATE TABLE IF NOT EXISTS prescription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prescription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own hospital prescription history"
  ON prescription_history FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Users can insert own hospital prescription history"
  ON prescription_history FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE INDEX idx_prescription_history_rx ON prescription_history(prescription_id, version_number);
```

### Code already updated
- LineItemsTab: soft delete with is_deleted/deleted_at/deleted_by
- BillEditor: filters out soft-deleted items in queries
- RosterTab: sets is_active=false instead of DELETE, filters inactive
- ConsultationWorkspace: saves prescription snapshot to history before UPDATE
