
-- AEFI reports table
CREATE TABLE IF NOT EXISTS public.aefi_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid NOT NULL,
  vaccination_record_id uuid,
  vaccine_name text NOT NULL,
  dose_number integer,
  vaccinated_at timestamptz,
  event_onset_hours integer,
  event_type text NOT NULL,
  event_severity text NOT NULL,
  event_description text,
  outcome text,
  treatment_given text,
  reported_by text,
  reported_to text,
  report_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'reported',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.aefi_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital isolation aefi select" ON public.aefi_reports
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Hospital isolation aefi insert" ON public.aefi_reports
  FOR INSERT WITH CHECK (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Hospital isolation aefi update" ON public.aefi_reports
  FOR UPDATE USING (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Hospital isolation aefi delete" ON public.aefi_reports
  FOR DELETE USING (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_aefi_reports_hospital ON public.aefi_reports(hospital_id);
CREATE INDEX IF NOT EXISTS idx_aefi_reports_patient ON public.aefi_reports(patient_id);

-- Camp vaccination records (linked to existing vaccine_camps)
CREATE TABLE IF NOT EXISTS public.camp_vaccination_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  camp_id uuid NOT NULL,
  patient_name text NOT NULL,
  patient_age text,
  patient_gender text,
  patient_phone text,
  vaccine_name text NOT NULL,
  vaccine_id uuid,
  lot_number text,
  dose_number integer DEFAULT 1,
  administered_at timestamptz DEFAULT now(),
  administered_by text,
  aefi_occurred boolean DEFAULT false,
  aefi_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.camp_vaccination_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital isolation camp_rec select" ON public.camp_vaccination_records
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Hospital isolation camp_rec insert" ON public.camp_vaccination_records
  FOR INSERT WITH CHECK (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Hospital isolation camp_rec update" ON public.camp_vaccination_records
  FOR UPDATE USING (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Hospital isolation camp_rec delete" ON public.camp_vaccination_records
  FOR DELETE USING (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_camp_records_hospital ON public.camp_vaccination_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_camp_records_camp ON public.camp_vaccination_records(camp_id);
