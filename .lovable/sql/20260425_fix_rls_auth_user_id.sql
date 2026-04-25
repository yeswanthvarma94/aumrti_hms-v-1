-- ============================================================
-- CRITICAL FIX (2026-04-25)
-- "Database disconnected / blank pages" across all modules.
--
-- Root cause: 6 RLS policies still compare `users.id = auth.uid()`,
-- but since the users table separated `public.users.id` from
-- `auth.users.id`, the correct column is `users.auth_user_id`.
-- Any user whose profile was created after that split silently
-- gets ZERO rows from those tables — and from their own profile —
-- which causes the entire app to render empty.
--
-- Apply this migration in Supabase SQL editor (or via the Lovable
-- migration tool when available). Safe to re-run.
-- ============================================================

-- 1) public.users — own profile UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 2) public.users — own profile SELECT policy
--    Lets AuthContext fetch the signed-in user's profile row
--    even before the broader hospital-scope policy can apply.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- 3) aefi_reports — replace the 4 broken hospital_id policies
DROP POLICY IF EXISTS "Hospital isolation aefi select" ON public.aefi_reports;
DROP POLICY IF EXISTS "Hospital isolation aefi insert" ON public.aefi_reports;
DROP POLICY IF EXISTS "Hospital isolation aefi update" ON public.aefi_reports;
DROP POLICY IF EXISTS "Hospital isolation aefi delete" ON public.aefi_reports;

CREATE POLICY "Hospital isolation aefi select" ON public.aefi_reports
  FOR SELECT TO authenticated
  USING (hospital_id = public.get_user_hospital_id());
CREATE POLICY "Hospital isolation aefi insert" ON public.aefi_reports
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = public.get_user_hospital_id());
CREATE POLICY "Hospital isolation aefi update" ON public.aefi_reports
  FOR UPDATE TO authenticated
  USING (hospital_id = public.get_user_hospital_id())
  WITH CHECK (hospital_id = public.get_user_hospital_id());
CREATE POLICY "Hospital isolation aefi delete" ON public.aefi_reports
  FOR DELETE TO authenticated
  USING (hospital_id = public.get_user_hospital_id());

-- 4) camp_vaccination_records — replace the 4 broken hospital_id policies
DROP POLICY IF EXISTS "Hospital isolation camp_rec select" ON public.camp_vaccination_records;
DROP POLICY IF EXISTS "Hospital isolation camp_rec insert" ON public.camp_vaccination_records;
DROP POLICY IF EXISTS "Hospital isolation camp_rec update" ON public.camp_vaccination_records;
DROP POLICY IF EXISTS "Hospital isolation camp_rec delete" ON public.camp_vaccination_records;

CREATE POLICY "Hospital isolation camp_rec select" ON public.camp_vaccination_records
  FOR SELECT TO authenticated
  USING (hospital_id = public.get_user_hospital_id());
CREATE POLICY "Hospital isolation camp_rec insert" ON public.camp_vaccination_records
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = public.get_user_hospital_id());
CREATE POLICY "Hospital isolation camp_rec update" ON public.camp_vaccination_records
  FOR UPDATE TO authenticated
  USING (hospital_id = public.get_user_hospital_id())
  WITH CHECK (hospital_id = public.get_user_hospital_id());
CREATE POLICY "Hospital isolation camp_rec delete" ON public.camp_vaccination_records
  FOR DELETE TO authenticated
  USING (hospital_id = public.get_user_hospital_id());

-- 5) Backfill: every public.users row whose id matches an auth user
--    should have auth_user_id populated. Idempotent.
UPDATE public.users
   SET auth_user_id = id
 WHERE auth_user_id IS NULL
   AND id IN (SELECT id FROM auth.users);
