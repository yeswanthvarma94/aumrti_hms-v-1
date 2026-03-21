

## HMS Platform v9.0 — Core Schema Setup

### 1. Create Core Database Tables (with migrations)

**hospitals** — Multi-tenant root table
- id (uuid, PK), name, type (enum: general/specialty/clinic/nursing_home), address, state, pincode, country, gstin, nabh_number, beds_count, logo_url, primary_color, subscription_tier (enum: basic/professional/enterprise), is_active, created_at

**branches** — Multi-branch support
- id (uuid, PK), hospital_id (FK → hospitals), name, address, is_main_branch, is_active, created_at

**departments** — Hospital departments
- id (uuid, PK), hospital_id (FK → hospitals), name, type (enum: clinical/administrative/support), head_doctor_id (uuid, nullable), is_active, created_at

**users** — Staff/system users (references auth.users via id)
- id (uuid, PK, FK → auth.users), hospital_id (FK → hospitals), branch_id (FK → branches), full_name, email, phone, role (enum: super_admin/hospital_admin/doctor/nurse/receptionist/pharmacist/lab_tech/accountant), department_id (FK → departments), employee_id, is_active, last_login, created_at

**patients** — Patient master
- id (uuid, PK), hospital_id (FK → hospitals), uhid (unique per hospital), full_name, dob, gender (enum: male/female/other), phone, address, blood_group, abha_id, emergency_contact (jsonb), created_at

### 2. Enable Row Level Security on All Tables
- All data isolated by `hospital_id` — no cross-hospital access
- Create a `get_user_hospital_id()` security definer function to safely retrieve the current user's hospital_id without recursive RLS
- Policies: authenticated users can only SELECT/INSERT/UPDATE/DELETE rows matching their own hospital_id

### 3. Enable Realtime
- Enable Supabase Realtime on `hospitals` table (beds data will be in a future `beds` table; `opd_tokens` and `ipd_admissions` tables will be added in subsequent modules)

### 4. Create Supabase Client Integration
- Update the generated types file after migration
- Set up the client integration for use in the React frontend

### 5. Build a Minimal Landing/Dashboard Page
- Replace the placeholder Index page with an HMS-branded landing showing "HMS Platform v9.0 — Connected" status, confirming Supabase connectivity

