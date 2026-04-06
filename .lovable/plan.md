

## Fix: OPD Not Saving + Physio Referral Failing

### Root Cause (same bug, two symptoms)

In `OPDPage.tsx` line 39, `userId` is set to `user.id` from `supabase.auth.getUser()` — this is the **Supabase Auth UUID** (`auth.uid()`).

But `opd_encounters.doctor_id` and `physio_referrals.referred_by` both have **foreign keys to `users.id`** (the internal `users` table primary key), which is a different UUID.

When `ConsultationWorkspace` tries to save an encounter with `doctor_id: userId` (auth UUID), the insert/update **silently fails** because the FK constraint is violated. Same for `referred_by: userId` in the physio referral insert — the error message in the screenshot confirms: `"violates foreign key constraint physio_referrals_referred_by_fkey"`.

### Fix

**File: `src/pages/opd/OPDPage.tsx`** (lines 37-39)

After fetching the user and looking up `userData` from the `users` table, store the **internal `users.id`** instead of `auth.uid()`:

```
Current:
  setUserId(user.id);                          // ← auth UUID
  const { data: userData } = await supabase
    .from("users").select("hospital_id")
    .eq("auth_user_id", user.id).single();

Fix:
  const { data: userData } = await supabase
    .from("users").select("id, hospital_id")   // ← also fetch internal id
    .eq("auth_user_id", user.id).single();
  setUserId(userData.id);                       // ← internal users.id
```

This single change fixes both issues because `userId` flows into:
- `ConsultationWorkspace` → `doctor_id` in encounters and prescriptions
- `ConsultationWorkspace` → `referred_by` in physio referrals

### Files Changed
1. `src/pages/opd/OPDPage.tsx` — fetch `id` from users table, use it as `userId`

### No other files changed
All downstream code already uses `userId` correctly — the value was just wrong at the source.

