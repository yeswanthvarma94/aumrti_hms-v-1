CREATE TABLE IF NOT EXISTS public.cryobank_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  ivf_cycle_id uuid,
  embryo_id text NOT NULL,
  embryo_grade text,
  freeze_date date NOT NULL,
  expiry_date date NOT NULL,
  storage_tank text NOT NULL,
  storage_canister text NOT NULL,
  storage_goblet text NOT NULL,
  cryo_medium text,
  status text NOT NULL DEFAULT 'frozen',
  thaw_date date,
  outcome text,
  consent_expiry_date date,
  consent_renewal_reminded_30d boolean DEFAULT false,
  consent_renewal_reminded_7d boolean DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cryobank_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital isolation - select"
  ON public.cryobank_records FOR SELECT
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Hospital isolation - insert"
  ON public.cryobank_records FOR INSERT
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Hospital isolation - update"
  ON public.cryobank_records FOR UPDATE
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Hospital isolation - delete"
  ON public.cryobank_records FOR DELETE
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cryobank_hospital ON public.cryobank_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cryobank_patient ON public.cryobank_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_cryobank_status ON public.cryobank_records(status);
CREATE INDEX IF NOT EXISTS idx_cryobank_consent_expiry ON public.cryobank_records(consent_expiry_date);
CREATE INDEX IF NOT EXISTS idx_cryobank_location ON public.cryobank_records(storage_tank, storage_canister, storage_goblet);