

## Add Password Sign-In Option

### What We're Building
Add a "Password" tab to the login modal alongside the existing Email OTP and Mobile OTP tabs. Also add password fields to registration Step 2 so admins can set a password during registration (used with `signUp` instead of pure OTP).

### Changes

**1. `src/components/auth/LoginModal.tsx`** — Add a 3rd tab "Password"
- Change TabsList from `grid-cols-2` to `grid-cols-3`
- Add new tab with Lock icon: "Password"
- Tab content: Email input + Password input + "Sign In" button
- Uses `supabase.auth.signInWithPassword({ email, password })`
- On success: redirect to `/dashboard`
- Below password field: "Forgot password?" link that triggers `supabase.auth.resetPasswordForEmail(email)` and shows a toast
- Keep existing Email OTP and Mobile OTP tabs unchanged

**2. `src/pages/register/Step2AdminAccount.tsx`** — Add password fields
- Add Password + Confirm Password fields (2-column grid) below email
- Show/hide toggle (eye icon) on each
- Password strength meter (4 segments: 8+ chars, uppercase, number, special char)
- Strength label: Weak / Fair / Strong / Very Strong

**3. `src/pages/register/constants.ts`** — Add `password` field
- Add `password: string` and `confirmPassword: string` to `RegistrationData` interface and `initialData`

**4. `src/pages/register/index.tsx`** — Use `signUp` with password instead of OTP
- In `handleLaunch`, replace `signInWithOtp` with `supabase.auth.signUp({ email, password })` when a password is set
- Remove the OTP verification phase entirely — after `signUp` the user is authenticated
- Then call `setup-hospital` edge function as before
- Keep the OTP flow as fallback if password is empty (backward compat)

**5. `src/pages/register/Step5Confirm.tsx`** — Simplify
- Remove the Email/Phone OTP verification method chooser since registration now uses password-based signup
- The "Launch" button directly creates the account (no OTP step)
- Remove `otpPhase`, `otp`, `onOtpChange` props

### Technical Notes
- `signInWithPassword` and `signUp` are built-in Supabase Auth methods — no migration needed
- Registration validation: password must match confirmPassword, minimum 8 chars
- Login modal password tab reuses the same modal layout, just different form content
- `canProceed(1)` in register/index.tsx updated to require password fields filled + matching + 8+ chars

