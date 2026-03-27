

# Fix: Revenue Not Syncing from Billing to Accounts/ERP

## Root Cause Analysis

The `ensure_billing_posting_rules()` database function fails silently because it references a **unique constraint** (`chart_of_accounts_hospital_id_code_key`) that **does not exist** on the table. This means:

1. The function crashes every time `handleFinalize()` calls it
2. No `bill_finalized_*` rules ever get created
3. Revenue journal entries are never posted
4. The Accounts Dashboard shows ₹0 revenue despite ₹61,608+ in billing

Additionally, payment rules still credit Revenue accounts (4001) directly instead of clearing Accounts Receivable — which would cause double-booking once finalization is fixed.

There are also duplicate rows in `chart_of_accounts` and `auto_posting_rules` from the initial seeding.

## Fix Plan

### Step 1: Database Migration — Add constraints and fix data

**Migration SQL to:**
- Deduplicate `chart_of_accounts` rows (keep first, delete rest per hospital+code)
- Deduplicate `auto_posting_rules` rows (keep first per hospital+trigger_event)
- Add unique constraint `chart_of_accounts_hospital_id_code_key` on `(hospital_id, code)`
- Add unique constraint on `auto_posting_rules(hospital_id, trigger_event)`
- Re-create `ensure_billing_posting_rules()` function using the now-valid constraints

### Step 2: Database Migration — Seed finalization rules + fix payment rules

For each hospital:
- Insert `bill_finalized_opd/ipd/lab/radiology/pharmacy/ot/generic` rules (Dr. AR 1010 / Cr. Revenue 4xxx)
- Insert `bill_insurance_reclassify` rule (Dr. Insurance AR 1011 / Cr. AR 1010)
- **Update** existing payment rules (`bill_payment_cash/upi/card`) to credit AR (1010) instead of Revenue (4001)

### Step 3: Backfill journal entries for existing finalized bills

Run a one-time backfill: for each finalized bill that has no corresponding journal entry, create the revenue recognition entry (Dr. AR / Cr. Revenue) using the correct amount and bill type.

### Step 4: Verify BillEditor.tsx integration

The existing code in `handleFinalize()` is correct — it already calls `ensure_billing_posting_rules` and `autoPostJournalEntry`. No changes needed once the DB constraints are fixed.

## Technical Details

**Files to modify:**
- New migration SQL (constraints, dedup, rule seeding, backfill)
- No frontend code changes needed

**Expected result after fix:**
- Accounts Dashboard shows real revenue from all finalized bills
- P&L Statement populated with revenue breakdown by department
- AR balance reflects unpaid bills
- New bills auto-post journal entries on finalization
- Payments clear AR instead of double-booking revenue

