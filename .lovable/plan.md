

## Add "Enable Login" to Settings Staff Page

### What
Add the ability for admins to create login credentials for staff members directly from the Staff settings page, using the `create-staff-login` edge function.

### Changes (single file: `src/pages/settings/SettingsStaffPage.tsx`)

**1. Update staff query (line 102)**
Add `auth_user_id, can_login` to the select string so the table knows each user's login status.

**2. Add state variables (after line 94)**
- `loginModal` — tracks which staff member's login modal is open (userId, userName, email)
- `loginEmail`, `loginPassword`, `creatingLogin` — form state for the modal

**3. Add `handleCreateLogin` handler**
Calls `supabase.functions.invoke("create-staff-login", { body: { user_id, email, password, full_name } })`. On success: toast, invalidate query, close modal. On error: show error toast.

**4. Add "Enable Login" button in table actions (line 400-408)**
- If `!u.auth_user_id && u.is_active` → show "Enable Login" button that opens the modal
- If `u.auth_user_id` → show "✓ Can Login" badge

**5. Add login status in Status column (after line 396)**
Show `• Login enabled` text next to Active badge when `u.can_login` is true.

**6. Add Login Credentials Modal (before closing `</div>` at line 645)**
A fixed overlay modal with:
- Staff member name display
- Email input (pre-filled from staff record)
- Password input with 8-char validation
- Cancel / Create Login buttons
- Loading state during creation

### No other files changed
The `create-staff-login` edge function already exists and handles all server-side logic.

