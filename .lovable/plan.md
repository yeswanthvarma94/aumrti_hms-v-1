

## Plan: OPD Token — Pay Before Issue

### Problem
Currently, clicking "Register & Issue Token" in the OPD Walk-In modal creates the token immediately without any billing step. The hospital wants patients to pay the consultation fee before a token is issued.

### Approach
Add a **two-step flow** inside the existing `WalkInModal`:

1. **Step 1 (current)**: Fill patient details, department, doctor, priority — as today
2. **Step 2 (new)**: After clicking "Proceed to Payment", show an inline billing step where:
   - Auto-create a draft OPD bill with a consultation fee line item
   - Show the bill amount (fetched from department/service rates or a default ₹500 configurable)
   - Offer payment modes: **Cash**, **UPI**, **Card**, **Skip (Pay Later)**
   - On payment confirmation → mark bill as paid → then create the token
   - "Pay Later" option creates the bill as unpaid but still issues the token (for hospitals that want flexibility)

### Technical Changes

**File: `src/components/opd/WalkInModal.tsx`**
- Add `step` state: `'details' | 'payment'`
- Step 1 renders current form; submit button becomes "Proceed to Payment →"
- Step 2 renders inline payment panel:
  - Shows: Patient name, department, doctor, consultation fee amount
  - Payment mode pills: Cash / UPI / Card / Pay Later
  - Amount input (pre-filled from consultation fee, editable)
  - "Pay & Issue Token →" button
- On payment submit:
  1. Create/find patient (existing logic)
  2. Create bill (`bills` table) with type `opd`
  3. Insert `bill_line_items` with consultation fee
  4. Insert `bill_payments` with selected payment mode + amount
  5. Update bill totals and payment_status
  6. Create `opd_tokens` entry
  7. Close modal with success toast

- "← Back" button on step 2 to return to details
- "Skip — Pay Later" link creates bill as `pending` payment but still issues token

**No new tables or routes needed.** Uses existing `bills`, `bill_line_items`, `bill_payments` tables.

### UI Layout (Step 2)
```text
┌─────────────────────────────┐
│  💳 Collect Consultation Fee │
│                             │
│  Patient: Ravi Kumar        │
│  Dept: General Medicine     │
│  Doctor: Dr. Sharma         │
│                             │
│  Consultation Fee           │
│  ┌─────────────────────┐    │
│  │  ₹ 500              │    │
│  └─────────────────────┘    │
│                             │
│  Payment Mode               │
│  [Cash] [UPI] [Card]        │
│                             │
│  ┌─────────────────────────┐│
│  │  💳 Pay & Issue Token → ││
│  └─────────────────────────┘│
│  Skip — Pay Later →         │
│  ← Back to details          │
└─────────────────────────────┘
```

