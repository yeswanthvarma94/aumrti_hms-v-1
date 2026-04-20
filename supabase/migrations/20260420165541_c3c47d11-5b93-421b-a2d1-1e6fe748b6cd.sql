CREATE TABLE IF NOT EXISTS public.ayush_homeopathy_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) NOT NULL,
  patient_id uuid NOT NULL,
  rubrics jsonb DEFAULT '[]'::jsonb,
  suggested_remedies jsonb DEFAULT '[]'::jsonb,
  prescribed_remedy text,
  prescribed_potency text,
  consultation_date date DEFAULT CURRENT_DATE,
  practitioner_id uuid,
  follow_up_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ayush_homeopathy_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital isolation" ON public.ayush_homeopathy_cases;
CREATE POLICY "Hospital isolation" ON public.ayush_homeopathy_cases
  FOR ALL
  USING (hospital_id = public.get_user_hospital_id())
  WITH CHECK (hospital_id = public.get_user_hospital_id());

CREATE INDEX IF NOT EXISTS idx_ayush_homeo_hospital ON public.ayush_homeopathy_cases(hospital_id, consultation_date DESC);
CREATE INDEX IF NOT EXISTS idx_ayush_homeo_patient ON public.ayush_homeopathy_cases(patient_id);