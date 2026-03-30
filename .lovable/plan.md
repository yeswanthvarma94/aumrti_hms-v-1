

## Root Cause

Both `WalkInModal` and `PatientRegistrationModal` use a custom backdrop div with `onClick={onClose}`. The `AddReferralDoctorModal` (Radix Dialog) is rendered as a **React child** inside this backdrop div but **outside** the inner content div that has `stopPropagation()`.

React's synthetic event system bubbles events through the **component tree** (not DOM tree). So even though Radix portals its overlay to `<body>`, clicks on the Radix overlay/content bubble through React's tree back to the backdrop's `onClick={onClose}`, closing the entire parent modal.

## Fix (2 files)

### 1. `src/components/opd/WalkInModal.tsx`
- Wrap the `<AddReferralDoctorModal>` in a `<div onClick={e => e.stopPropagation()}>` to prevent React synthetic events from reaching the backdrop's `onClick={onClose}`.

### 2. `src/components/patients/PatientRegistrationModal.tsx`
- Same fix: wrap `<AddReferralDoctorModal>` in a `<div onClick={e => e.stopPropagation()}>`.

This is a minimal, targeted fix — no other files change.

