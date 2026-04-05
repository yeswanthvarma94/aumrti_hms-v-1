

## Create `create-staff-login` Edge Function

### What
Create a new Supabase Edge Function that allows hospital admins to create login credentials for existing staff members.

### Changes

**File: `supabase/functions/create-staff-login/index.ts`** (new)
- Use the exact code provided by the user
- Function accepts `{ user_id, email, password, full_name }`
- Verifies caller is authenticated and is `hospital_admin` or `super_admin`
- Verifies target staff belongs to same hospital and doesn't already have auth credentials
- Creates Supabase Auth account, links it to the `users` row via `auth_user_id`, sets `can_login = true`
- Handles cleanup on failure (deletes auth account if DB update fails)
- Includes CORS headers

### No other files changed
The function will auto-deploy. No frontend changes in this step.

