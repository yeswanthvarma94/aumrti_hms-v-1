

# Billing Module — /billing

## Overview
Build a unified billing module that pulls charges from OPD, Lab, Radiology, Pharmacy, and IPD into one patient bill. Supports split payments, discount approval workflow, advance receipts, and insurance tagging.

## Step 1: Database Migration

**DROP and recreate `bills` table** (current table is minimal with only basic columns). Create new tables:

- **bills** — Full schema with bill_type, bill_status, subtotal, discount fields, GST, advance, insurance, patient_payable, balance_due, created_by, etc.
- **bill_line_items** — Individual charges with item_type, quantity, rates, GST, HSN, source_module tracking, insurance coverage flag
- **bill_payments** — Split payment support with multiple modes (cash/upi/card/insurance/pmjay/advance_adjust)
- **advance_receipts** — Pre-bill advance collection with receipt numbers
- **discount_approvals** — Approval workflow for discounts above threshold

**ALTER service_master** — Add `hsn_code text`, `gst_percent numeric(5,2) default 0`, `item_type text default 'service'`

**Seed** default service rates (consultation, room charges, procedures, radiology, nursing) and 3 sample bills for testing.

RLS on all new tables: `hospital_id = get_user_hospital_id()`

## Step 2: UI Components

### BillingPage (`src/pages/billing/BillingPage.tsx`)
- 2-panel layout: 320px left queue + flex:1 right editor
- Zero scroll, calc(100vh - 56px)

### Left Panel — Bill Queue (`src/components/billing/BillQueue.tsx`)
- Header with filter tabs (All/Draft/Unpaid/Partial/Insurance/Today)
- Stats bar (today's collection, pending amount, bill count)
- Date filter pills (Today/Yesterday/This Week/This Month)
- Bill cards with left-border color by payment_status, bill number, patient name, amount, balance due
- Footer with Advance Receipt button

### Center Panel — Bill Editor (`src/components/billing/BillEditor.tsx`)
- Empty state when no bill selected
- Bill header: patient info, bill number, status badge, action buttons by status
- 3-tab strip: Line Items | Payments | Insurance

### Line Items Tab (`src/components/billing/tabs/LineItemsTab.tsx`)
- Auto-pull banner showing source modules
- Editable table: description, qty, rate, disc%, GST%, amount, delete
- Add Service search from service_master with category quick-add buttons
- Bill totals section: subtotal, discount (with approval workflow), GST breakdown, advance/insurance deductions, patient payable, balance due
- Number-to-words for total amount

### Payments Tab (`src/components/billing/tabs/PaymentsTab.tsx`)
- Split payment form: multiple rows with mode dropdown + amount + reference
- Payment history table
- Advance adjustment banner

### Insurance Tab (`src/components/billing/tabs/InsuranceTab.tsx`)
- TPA/insurer details, policy number, pre-auth
- Coverage type toggle (cashless/reimbursement)
- PMJAY section

### New Bill Modal (`src/components/billing/NewBillModal.tsx`)
- Patient search, bill type selection, encounter/admission linking
- Auto-pull charges on creation
- Generate bill number: BILL-{YYYYMMDD}-{seq}

### Advance Receipt Modal (`src/components/billing/AdvanceReceiptModal.tsx`)
- Patient search, amount, payment mode
- Generate receipt: ADV-{YYYYMMDD}-{seq}

## Step 3: Routing & Sidebar

- Add `/billing` route in App.tsx pointing to BillingPage
- Update AppSidebar: remove `comingSoon` from Finance/Billing, keep Insurance and Payments as coming soon
- Update Finance sub-menu: Billing → /billing, Insurance → still coming soon, Payments → still coming soon

## Technical Notes
- Auto-pull logic runs on bill creation when encounter_id or admission_id is provided — queries lab_orders, radiology_orders, pharmacy_dispensing, admissions for linked charges
- All amounts computed client-side with live recalculation on edits
- WhatsApp bill sharing via wa.me link
- Print uses browser print dialog with @media print styles

