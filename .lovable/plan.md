

## Fix: Telemedicine Billing on Call End

### What exists
- `teleconsult_sessions` table already exists with columns: status, ended_at, actual_duration, bill_generated, notes
- TelemedicinePage already updates the session on joinCall/endCall
- Missing: `bill_id` column on `teleconsult_sessions`, and zero billing logic

### Changes

**1. SQL Migration — Add bill_id column**
```sql
ALTER TABLE teleconsult_sessions ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id);
```

**2. `src/pages/telemedicine/TelemedicinePage.tsx` — Add billing to endCall**

Import `generateBillNumber` from `@/hooks/useBillNumber` and `autoPostJournalEntry` from `@/lib/accounting`.

Modify the `endCall` function to, after marking session completed:
1. Look up teleconsultation fee from `service_master` WHERE `name ilike '%tele%'` AND `item_type = 'consultation'`, fallback to regular consultation fee, then fallback ₹300
2. Call `generateBillNumber(hospitalId, 'TELE')` for atomic bill number
3. Insert bill: `bill_type='opd'`, `bill_status='final'`, `payment_status='unpaid'`
4. Insert `bill_line_item` with description "Teleconsultation - {patient name} - {duration}min"
5. Update bill totals (net = fee + GST)
6. Update `teleconsult_sessions` with `bill_generated=true`, `bill_id=bill.id`
7. Call `autoPostJournalEntry` with `triggerEvent: 'bill_created'`
8. Toast: "Teleconsultation billed: ₹X"

All billing wrapped in try/catch so call-end never fails.

### Files changed
1. SQL migration — add `bill_id` column
2. `src/pages/telemedicine/TelemedicinePage.tsx` — billing logic in endCall

### No new table needed
The user's request mentioned creating `telemedicine_sessions` but `teleconsult_sessions` already serves this purpose with all required columns. We just add `bill_id` and the billing trigger.

