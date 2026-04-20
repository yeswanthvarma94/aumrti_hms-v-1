
-- Vendor-Item rate catalogue for procurement comparison
CREATE TABLE IF NOT EXISTS public.vendor_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  lead_time_days integer DEFAULT 7,
  last_po_date date,
  is_preferred boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (hospital_id, vendor_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_items_item ON public.vendor_items(item_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON public.vendor_items(vendor_id);

ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital isolation - vendor_items select"
  ON public.vendor_items FOR SELECT
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Hospital isolation - vendor_items insert"
  ON public.vendor_items FOR INSERT
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Hospital isolation - vendor_items update"
  ON public.vendor_items FOR UPDATE
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Hospital isolation - vendor_items delete"
  ON public.vendor_items FOR DELETE
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Hospital procurement settings (auto-approve threshold etc.)
CREATE TABLE IF NOT EXISTS public.procurement_settings (
  hospital_id uuid PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  auto_approve_po boolean DEFAULT false,
  auto_approve_threshold numeric(12,2) DEFAULT 10000,
  notify_vendor_on_approval boolean DEFAULT true,
  default_lead_time_days integer DEFAULT 7,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.procurement_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital isolation - procurement_settings all"
  ON public.procurement_settings FOR ALL
  USING (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.users WHERE auth_user_id = auth.uid()));
