-- =====================================================================
-- APPLY THIS MIGRATION via Supabase SQL Editor or `supabase db push`
-- =====================================================================
-- It creates one RPC that the dashboard now calls instead of 9 separate
-- client queries, plus indexes for the hottest tenant-scoped queries.
-- The frontend is backwards-compatible: if the RPC isn't deployed yet,
-- it transparently falls back to the old per-query path.
-- =====================================================================

-- ---------- 1. RPC: get_dashboard_kpis ----------
create or replace function public.get_dashboard_kpis(
  p_hospital_id uuid,
  p_today date
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_month_start      date := date_trunc('month', p_today)::date;
  v_last_month_start date := date_trunc('month', p_today - interval '1 month')::date;
  v_last_month_end   date := (date_trunc('month', p_today) - interval '1 day')::date;
begin
  return json_build_object(
    'totalPatients',
      (select count(*) from patients
        where hospital_id = p_hospital_id),
    'patientsToday',
      (select count(*) from patients
        where hospital_id = p_hospital_id
          and created_at >= p_today::timestamptz
          and created_at <  (p_today + 1)::timestamptz),
    'bedsOccupied',
      (select count(*) from beds
        where hospital_id = p_hospital_id
          and is_active = true
          and status = 'occupied'),
    'bedsTotal',
      (select count(*) from beds
        where hospital_id = p_hospital_id
          and is_active = true),
    'opdActive',
      (select count(*) from opd_visits
        where hospital_id = p_hospital_id
          and visit_date = p_today
          and status <> 'cancelled'),
    'opdWaiting',
      (select count(*) from opd_visits
        where hospital_id = p_hospital_id
          and visit_date = p_today
          and status = 'waiting'),
    'opdSeen',
      (select count(*) from opd_visits
        where hospital_id = p_hospital_id
          and visit_date = p_today
          and status = 'completed'),
    'revenueMTD',
      (select coalesce(sum(paid_amount), 0) from bills
        where hospital_id = p_hospital_id
          and bill_date >= v_month_start
          and payment_status in ('paid', 'partial')),
    'revenueLastMonth',
      (select coalesce(sum(paid_amount), 0) from bills
        where hospital_id = p_hospital_id
          and bill_date between v_last_month_start and v_last_month_end
          and payment_status in ('paid', 'partial')),
    'doctorsOnDuty',
      (select count(*) from users
        where hospital_id = p_hospital_id
          and role = 'doctor'
          and is_active = true),
    'doctorsOnLeave',
      (select count(*) from staff_attendance
        where hospital_id = p_hospital_id
          and attendance_date = p_today
          and status = 'leave'),
    'criticalAlerts',
      (select count(*) from clinical_alerts
        where hospital_id = p_hospital_id
          and is_acknowledged = false)
  );
end;
$$;

grant execute on function public.get_dashboard_kpis(uuid, date) to authenticated;

-- ---------- 2. Performance indexes ----------
create index if not exists idx_bills_hospital_date
  on bills(hospital_id, bill_date, payment_status);

create index if not exists idx_opd_visits_hospital_date
  on opd_visits(hospital_id, visit_date, status);

create index if not exists idx_opd_tokens_hospital_date
  on opd_tokens(hospital_id, visit_date, status);

create index if not exists idx_clinical_alerts_hospital_ack
  on clinical_alerts(hospital_id, is_acknowledged);

create index if not exists idx_patients_hospital_created
  on patients(hospital_id, created_at);

create index if not exists idx_staff_attendance_hospital_date
  on staff_attendance(hospital_id, attendance_date, status);

create index if not exists idx_beds_hospital_active_status
  on beds(hospital_id, is_active, status);

create index if not exists idx_users_hospital_role_active
  on users(hospital_id, role, is_active);
