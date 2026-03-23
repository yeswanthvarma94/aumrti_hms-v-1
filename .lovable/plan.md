

# Payment Collections Engine

## Overview
Add payment link generation, UPI QR codes on bills, a collections dashboard at `/billing/payments`, and a Razorpay webhook edge function for auto-reconciliation.

## Step 1: Database Migration
- Add `payment_link_sent boolean default false` to `bills` table
- No new tables needed

## Step 2: Payment Link Modal
**New file**: `src/components/billing/PaymentLinkModal.tsx`
- Pre-fills amount (balance_due), patient phone from props
- Generates WhatsApp message with bill details and payment link
- If `hospital.razorpay_key_id` exists, shows note about Razorpay integration (actual API call would need edge function for security — use demo link for now)
- Copy link button + Send on WhatsApp button
- On send: updates `bills.payment_link_sent = true`

**Modify**: `src/components/billing/BillEditor.tsx`
- Add "Send Payment Link" button in the header action bar (next to Print)
- Only show when `balance_due > 0`
- Opens PaymentLinkModal

## Step 3: UPI QR Code on Bill
**Install**: `qrcode.react` package

**Modify**: `src/components/billing/GSTInvoiceModal.tsx` (or create a separate print component)
- Add UPI QR section at the bottom of the invoice/bill print view
- Generate UPI string: `upi://pay?pa={upi_id}&pn={hospital_name}&am={balance_due}&cu=INR&tn=Bill-{bill_number}`
- Show QR only when `balance_due > 0`
- For now, use a placeholder UPI ID or fetch from hospital settings

Also add QR to the BillEditor's print section by creating a hidden print-friendly div with UPI QR.

## Step 4: Collections Dashboard
**New file**: `src/pages/billing/PaymentsPage.tsx`
- Full-width layout with header
- 4 KPI cards: Collected Today, Outstanding, Links Sent, Advances on Hold
- Collections table: query `bill_payments` joined with `bills` and `patients`, filterable by date and payment mode
- Daily summary bar chart (Recharts) showing breakdown by payment mode
- Export/Print buttons

## Step 5: Razorpay Webhook Edge Function
**New file**: `supabase/functions/razorpay-webhook/index.ts`
- Handles `payment.captured` events
- Extracts `payment_link_id` from payload, matches to bill via notes field
- Inserts `bill_payments` record and updates `bills` amounts
- Returns 200 OK
- Manual reconciliation fallback UI in PaymentsPage for when webhooks aren't configured

## Step 6: Routing & Sidebar
**Modify** `src/App.tsx`:
- Change `/payments` route from `ComingSoon` to `PaymentsPage`
- Or add `/billing/payments` route pointing to PaymentsPage

**Modify** `src/components/layout/AppSidebar.tsx`:
- Update Finance sub-menu: Payments path → `/payments`, remove `comingSoon: true`

## Technical Notes
- UPI QR uses `qrcode.react` with standard UPI deep link format
- Razorpay API calls for payment link creation should go through an edge function (not client-side) for security — initial implementation uses demo links with a note to configure Razorpay
- Collections dashboard queries `bill_payments` with date filters and aggregates by payment mode

