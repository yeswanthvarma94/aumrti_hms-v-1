CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) NOT NULL,
  asset_code text NOT NULL,
  asset_name text NOT NULL,
  category text NOT NULL,
  description text,
  purchase_date date NOT NULL,
  purchase_cost numeric(14,2) NOT NULL,
  vendor_id uuid,
  useful_life_years integer DEFAULT 5,
  salvage_value numeric(14,2) DEFAULT 0,
  depreciation_method text DEFAULT 'slm',
  wdv_rate numeric(5,2),
  current_book_value numeric(14,2),
  accumulated_depreciation numeric(14,2) DEFAULT 0,
  location text,
  department text,
  insurance_policy_number text,
  insurance_expiry_date date,
  insurance_premium numeric(12,2),
  it_block_category text,
  status text DEFAULT 'active',
  disposal_date date,
  disposal_amount numeric(12,2),
  disposal_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital isolation - select" ON public.assets FOR SELECT
  USING (hospital_id = (SELECT users.hospital_id FROM public.users WHERE users.auth_user_id = auth.uid() LIMIT 1));

CREATE POLICY "Hospital isolation - insert" ON public.assets FOR INSERT
  WITH CHECK (hospital_id = (SELECT users.hospital_id FROM public.users WHERE users.auth_user_id = auth.uid() LIMIT 1));

CREATE POLICY "Hospital isolation - update" ON public.assets FOR UPDATE
  USING (hospital_id = (SELECT users.hospital_id FROM public.users WHERE users.auth_user_id = auth.uid() LIMIT 1));

CREATE POLICY "Hospital isolation - delete" ON public.assets FOR DELETE
  USING (hospital_id = (SELECT users.hospital_id FROM public.users WHERE users.auth_user_id = auth.uid() LIMIT 1));

CREATE INDEX IF NOT EXISTS idx_assets_hospital ON public.assets(hospital_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(hospital_id, category);
CREATE INDEX IF NOT EXISTS idx_assets_insurance_expiry ON public.assets(hospital_id, insurance_expiry_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_assets_code ON public.assets(hospital_id, asset_code);