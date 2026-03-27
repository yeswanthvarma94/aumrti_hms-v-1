
-- Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  is_system boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coa_hospital_isolation" ON public.chart_of_accounts FOR ALL TO authenticated USING (hospital_id = public.get_user_hospital_id());

-- Journal Entries (header)
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),
  entry_number text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  narration text,
  source_module text,
  source_ref_id uuid,
  is_auto boolean DEFAULT false,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, entry_number)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "je_hospital_isolation" ON public.journal_entries FOR ALL TO authenticated USING (hospital_id = public.get_user_hospital_id());

-- Journal Entry Lines (debit/credit)
CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
  debit numeric(15,2) DEFAULT 0,
  credit numeric(15,2) DEFAULT 0,
  narration text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jel_hospital_isolation" ON public.journal_entry_lines FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.hospital_id = public.get_user_hospital_id()));

-- Function to get next journal entry number
CREATE OR REPLACE FUNCTION public.get_next_journal_number(p_hospital_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT 'JE-' || LPAD((COALESCE(
    (SELECT COUNT(*) + 1 FROM public.journal_entries WHERE hospital_id = p_hospital_id),
    1
  ))::text, 6, '0');
$$;
