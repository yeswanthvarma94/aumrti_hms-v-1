

## Fix: New Hospital Data Not Loading — `auth_user_id` Never Set

### Root Cause

The `register-hospital` edge function creates a user record with `id: authUserId` but **never sets `auth_user_id`**. Every query in the app — and every RLS policy — looks up the user via `auth_user_id`. Since it is always NULL, no data is returned for any user.

Database proof: all 10+ user rows have `auth_user_id = NULL`.

### Changes

**1. Fix the edge function: `supabase/functions/register-hospital/index.ts`**

Add `auth_user_id: userId` to the users INSERT (line 109-117):

```typescript
.insert({
  hospital_id: hospitalData.id,
  full_name: admin.full_name,
  email: admin.email,
  phone: admin.phone || null,
  role: "hospital_admin",
  is_active: true,
  auth_user_id: userId,   // <-- ADD THIS
})
```

Remove `id: userId` — let the `id` column use its default `gen_random_uuid()`. The `id` column is the table's primary key and should not be overridden with the auth UUID (that is what `auth_user_id` is for).

**2. Fix existing broken users via migration**

Run a SQL migration to backfill `auth_user_id` for all existing users where `id` was set to the auth UUID:

```sql
UPDATE public.users
SET auth_user_id = id
WHERE auth_user_id IS NULL
  AND id IN (SELECT id FROM auth.users);
```

This one-time migration matches users whose `id` column happens to equal their auth UUID (set by the old registration code) and populates the correct column.

**3. Add `can_login: true` to registration (optional but recommended)**

The `can_login` column defaults to `false`. The admin user created during registration should be able to log in. Add `can_login: true` to the INSERT in the edge function.

### What This Fixes

- Dashboard loads real data for the logged-in user's hospital
- Sidebar shows correct user name and role instead of "User"
- All hospital-scoped queries return the correct data
- RLS policies correctly scope data per hospital
- Login page role-based routing works (currently falls back to "receptionist")

### Files Changed

1. `supabase/functions/register-hospital/index.ts` — add `auth_user_id` and `can_login`
2. One SQL migration — backfill existing users

### No Other Files Changed

All app-side queries already use `auth_user_id` correctly. The bug is entirely in the registration flow and existing data.

