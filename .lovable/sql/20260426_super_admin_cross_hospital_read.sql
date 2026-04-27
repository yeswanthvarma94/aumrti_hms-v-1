-- ============================================================================
-- Super-admin cross-hospital read access
-- Apply this in: Supabase Dashboard → SQL Editor → run the whole script
-- ============================================================================
-- Existing RLS scopes every table to the caller's own hospital via
-- public.get_user_hospital_id(). Super admins are meant to be able to view all
-- hospitals (branch picker, cross-hospital dashboards) but currently can't,
-- because no policy carves out an exception for them.
--
-- This migration:
--   1. Adds a SECURITY DEFINER helper `is_super_admin()` (avoids recursion
--      against the users table inside RLS evaluation).
--   2. Adds an additional PERMISSIVE SELECT policy on each core table that
--      grants read access when the caller is a super_admin.
--   3. Leaves all existing per-hospital policies and write policies in place,
--      so writes still require the user's own hospital_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Add a permissive SELECT policy "Super admins can view all <table>" on every
-- core table. Skips silently if a table doesn't exist (idempotent).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'hospitals',
    'users',
    'patients',
    'bills',
    'bill_line_items',
    'bill_payments',
    'admissions',
    'appointments',
    'opd_encounters',
    'opd_tokens',
    'opd_visits',
    'prescriptions',
    'lab_orders',
    'lab_order_items',
    'lab_samples',
    'radiology_orders',
    'radiology_reports',
    'pharmacy_dispensing',
    'audit_log',
    'wards',
    'beds',
    'departments',
    'clinical_alerts',
    'staff_attendance',
    'staff_profiles',
    'whatsapp_notifications',
    'chronic_disease_programs',
    'inventory_items',
    'inventory_stock',
    'drug_master',
    'drug_batches',
    'patient_consents',
    'incident_reports',
    'duty_roster',
    'shift_master'
  ];
  policy_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      CONTINUE;
    END IF;

    policy_name := format('Super admins can view all %s', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_super_admin())',
      policy_name, t
    );
  END LOOP;
END $$;
