

## Plan: Fix Pharmacy IP Billing Sync and Retail Patient Fetch

### Two Issues

**1. IP Dispensing Not Syncing to IPD Billing**

The IP dispensing workflow creates a `pharmacy_dispensing` record but never creates a corresponding `bill` in the `bills` table. The IPD discharge workflow checks for a paid bill with matching `admission_id` to mark billing as cleared. Without a bill record, this can never happen.

**Fix in `src/components/pharmacy/ip/DispensingWorkspace.tsx`:**
- After successful dispensing, auto-create a bill record in `bills` table:
  - `hospital_id`, `patient_id`, `admission_id` from the prescription
  - `bill_type: 'pharmacy'`, `bill_status: 'final'`
  - `total_amount`, `net_amount` from dispensed totals
  - `payment_status: 'unpaid'` (billing team collects payment separately)
  - `bill_number` auto-generated (e.g., `PHARM-YYYYMMDD-XXXX`)
  - `bill_date: today`
- This bill then appears in the billing module for payment collection
- When billing marks it paid → `billing_cleared` auto-sets on the admission (already wired)

**2. Retail Counter Cannot Fetch Patient Data + No Create Option**

The `findPatientByPhone` function works but requires the user to be authenticated (RLS policy uses `get_user_hospital_id()`). If auth context is missing or the hospital_id doesn't match, no results return silently.

**Fix in `src/components/pharmacy/retail/RetailCart.tsx` and `RetailPOS.tsx`:**
- Add a visible status indicator when searching (loading spinner while debounced search runs)
- When phone >= 10 digits and no patient found, show a **"+ Register New Patient"** button
- Clicking it opens an inline form (name, gender, age fields) or directly calls `createPatientRecord` with the entered phone + name
- After creation, auto-link the new patient to the cart (`customerId` set)
- Add a green checkmark when patient is found and linked

**Changes to `RetailPOS.tsx`:**
- Add `searching` state to show loading indicator during phone lookup
- Add `handleCreateCustomer` function that calls `createPatientRecord` and sets `customerId`
- Pass `searching` and `onCreateCustomer` to `RetailCart`

**Changes to `RetailCart.tsx`:**
- Accept `searching` and `onCreateCustomer` props
- Show spinner while searching
- Show "Register New Patient" button when phone >= 10 and no match
- Show green linked badge when patient found

### Files Modified
1. `src/components/pharmacy/ip/DispensingWorkspace.tsx` — create bill record after IP dispense
2. `src/components/pharmacy/retail/RetailPOS.tsx` — add search state, create patient handler
3. `src/components/pharmacy/retail/RetailCart.tsx` — show search status, register button

