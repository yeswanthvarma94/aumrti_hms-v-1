

# Fix: Link Billing Revenue to Accounts/ERP

## Problem
When a bill is finalized, no journal entry is created. Revenue only appears when payments are collected (cash-basis). This means:
- Unpaid/insurance bills show zero revenue
- The P&L understates income
- Accounts Receivable is never booked

## Root Cause
`BillEditor.handleFinalize()` updates the bill status but never calls `autoPostJournalEntry`. The only accounting hook is in `PaymentsTab`, which posts cash/bank entries on payment collection.

## Solution
Add **accrual-basis revenue recognition** at bill finalization, plus ensure payment collection entries work correctly.

### Step 1: Add auto-posting rules for bill finalization (DB migration)

Seed new rules for revenue recognition at finalization:
- `bill_finalized_opd`: Dr. Accounts Receivable (1010) / Cr. OPD Revenue (4001)
- `bill_finalized_ipd`: Dr. Accounts Receivable (1010) / Cr. IPD Revenue (4002)
- `bill_finalized_lab`: Dr. Accounts Receivable (1010) / Cr. Lab Revenue (4004)
- `bill_finalized_radiology`: Dr. Accounts Receivable (1010) / Cr. Radiology Revenue (4005)
- `bill_finalized_pharmacy`: Dr. Accounts Receivable (1010) / Cr. Pharmacy Revenue (4006)
- `bill_finalized_ot`: Dr. Accounts Receivable (1010) / Cr. OT Revenue (4003)
- `bill_finalized_generic`: Dr. Accounts Receivable (1010) / Cr. OPD Revenue (4001) — fallback

Also add payment-side rules to clear the receivable:
- `bill_payment_cash`: Dr. Cash (1001) / Cr. Accounts Receivable (1010) — **change from current Cr. 4001**
- `bill_payment_upi`: Dr. Bank (1002) / Cr. Accounts Receivable (1010)
- `bill_payment_card`: Dr. Bank (1002) / Cr. Accounts Receivable (1010)
- `bill_payment_insurance`: Dr. Insurance Receivable (1011) / Cr. Accounts Receivable (1010)

This follows proper double-entry: finalization books revenue + receivable, payment clears receivable.

### Step 2: Add revenue posting in `BillEditor.handleFinalize()`

After updating bill status to "final", call `autoPostJournalEntry` for the full bill amount:
- Determine bill type (opd/ipd/lab etc.) from `bill.bill_type`
- Use trigger event `bill_finalized_{type}`
- Amount = `bill.total_amount` (full revenue)
- This creates: Dr. Accounts Receivable / Cr. Revenue

### Step 3: Update payment rules to clear receivable (not double-book revenue)

Update the existing seeded rules so that payment collection entries debit Cash/Bank and credit Accounts Receivable (1010) instead of crediting Revenue (4001). Revenue was already recognized at finalization.

### Step 4: Handle insurance portion separately

When a bill has an insurance component (`bill.insurance_amount > 0`), post an additional entry at finalization:
- Dr. Insurance Receivable (1011) / Cr. Accounts Receivable (1010) — reclassify the insurance portion

### Technical Details

**Files to modify:**
1. **New migration SQL** — Update `auto_posting_rules`: add `bill_finalized_*` rules, update payment rules to credit 1010 instead of 4001
2. **`src/components/billing/BillEditor.tsx`** — Add `autoPostJournalEntry` call in `handleFinalize()` after status update
3. **`src/lib/accounting.ts`** — No changes needed (existing `autoPostJournalEntry` handles everything)

**Accounting flow after fix:**
```text
Bill Finalized (₹10,000 OPD bill):
  Dr. Accounts Receivable (1010)  ₹10,000
  Cr. OPD Revenue (4001)          ₹10,000

Payment Received (₹10,000 cash):
  Dr. Cash in Hand (1001)         ₹10,000
  Cr. Accounts Receivable (1010)  ₹10,000

Result: Revenue shows in P&L, AR clears on payment
```

