

## Problem

Two related issues from your screenshots:

**A. Staff creation shows wrong roles after creating a custom role**
When you create a new role in `/settings/roles` (e.g., "Admin", "OT"), the `Add Staff Member` modal stops showing the default 7 system roles (Doctor, Nurse, Billing, Pharmacist, Lab Tech, Reception, Admin/CEO) and only shows the custom ones. Worse, those custom roles have synthetic names like `custom_1776588267208` that the database `app_role` enum rejects → cannot save staff.

Root cause in `SettingsStaffPage.tsx` lines 141-153:
```ts
if (customRoles && customRoles.length > 0) {
  return customRoles.map(...);   // ← replaces defaults entirely
}
return DEFAULT_ROLE_CARDS;
```
And new hospitals never get the 7 system `role_permissions` rows seeded, so the only rows that exist are the bad `custom_*` ones.

**B. Hospital founder is `hospital_admin`, not `super_admin`**
Every recently-registered hospital owner is `hospital_admin`. You want them to be `super_admin` so they own the entire hospital and can manage everything.

## Fix Plan

### 1. Always show valid system roles + filter out invalid custom names
In `src/pages/settings/SettingsStaffPage.tsx`:
- Define a `VALID_APP_ROLES` constant (the 14 enum values from the DB).
- Build `ROLE_CARDS` as: **always** the 7 default cards (Doctor, Nurse, Billing, Pharmacist, Lab Tech, Reception, Admin/CEO), **plus** any custom role from `role_permissions` whose `role_name` is in `VALID_APP_ROLES` (so admins can rename labels, e.g. "Billing Executive" → "Cashier", but never inject invalid enum values).
- Skip any `role_name` starting with `custom_` from the staff picker.
- Add a guard in `saveStaff` mutation: if `form.role` not in `VALID_APP_ROLES`, show toast and abort.
- Apply same filter to `FILTER_TABS`.

### 2. Stop creating invalid custom role names in Roles & Permissions
In `src/pages/settings/SettingsRolesPage.tsx`:
- Replace the "Create" button behaviour. Instead of generating `custom_${Date.now()}`, open a small picker that asks **"Customise permissions for which role?"** with a dropdown of the 14 valid `app_role` values (excluding ones already in the table for this hospital).
- The created `role_permissions` row uses the chosen enum value as `role_name` (so it stays compatible with `users.role`). Custom `role_label` is still freely editable.
- This keeps the "Roles & Permissions" page useful for permission overrides without ever inventing fake role names.

### 3. Auto-seed default `role_permissions` for new hospitals
Add a migration: a Postgres function `seed_default_roles_for_hospital(p_hospital_id uuid)` that inserts the 7 default system role rows (super_admin, hospital_admin, doctor, nurse, receptionist, pharmacist, lab_tech) with sensible default permission JSON if they don't already exist. Backfill all existing hospitals once. Optionally call it from the registration flow too.

### 4. Make hospital founder a `super_admin`
Locate the hospital registration flow (the page/edge function that inserts the first `users` row when a new hospital is registered) and change `role: 'hospital_admin'` → `role: 'super_admin'`. Add a migration to upgrade **existing** founders: for every hospital, promote the **earliest-created** `hospital_admin` user to `super_admin` so each hospital has one full owner. This person already bypasses all RoleGuard checks (line 12 of `RoleGuard.tsx`), so no permission code needs to change.

### 5. Cleanup migration
- `DELETE FROM role_permissions WHERE role_name LIKE 'custom_%';` — removes the broken rows already in the DB so they stop appearing in any UI.

## Files to change
- `src/pages/settings/SettingsStaffPage.tsx` — add `VALID_APP_ROLES`, merge defaults + valid customs, guard save.
- `src/pages/settings/SettingsRolesPage.tsx` — replace `Create` flow with enum-picker.
- New migration: seed function + backfill defaults + promote founders + cleanup `custom_*`.
- The registration page/edge function (I'll locate exact file in default mode) — change founder role to `super_admin`.

## Out of scope
- Adding new values to the `app_role` enum (would cascade through ~108 references).
- Changing the visual layout of the Add Staff modal.

