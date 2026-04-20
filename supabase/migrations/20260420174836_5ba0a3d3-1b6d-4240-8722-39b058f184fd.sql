-- Add SLA & assignment fields to inbox_messages
ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_inbox_messages_sla_deadline
  ON public.inbox_messages(sla_deadline) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inbox_messages_assigned_to
  ON public.inbox_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_priority
  ON public.inbox_messages(priority) WHERE resolved_at IS NULL;

-- Validation: priority values
CREATE OR REPLACE FUNCTION public.validate_inbox_priority()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.priority IS NOT NULL AND NEW.priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_validate_priority ON public.inbox_messages;
CREATE TRIGGER trg_inbox_validate_priority
  BEFORE INSERT OR UPDATE ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_inbox_priority();

-- Auto-set sla_deadline based on channel/category/content
CREATE OR REPLACE FUNCTION public.set_inbox_sla_deadline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_body text;
  v_category text;
BEGIN
  IF NEW.sla_deadline IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_body := lower(COALESCE(NEW.message_body, ''));
  v_category := lower(COALESCE(NEW.category, ''));

  IF NEW.channel = 'grievance' THEN
    NEW.sla_deadline := COALESCE(NEW.created_at, now()) + interval '2 hours';
  ELSIF v_category = 'billing'
        OR v_body LIKE '%bill%' OR v_body LIKE '%payment%' OR v_body LIKE '%charge%' THEN
    NEW.sla_deadline := COALESCE(NEW.created_at, now()) + interval '24 hours';
  ELSE
    NEW.sla_deadline := COALESCE(NEW.created_at, now()) + interval '4 hours';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_set_sla ON public.inbox_messages;
CREATE TRIGGER trg_inbox_set_sla
  BEFORE INSERT ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_inbox_sla_deadline();

-- Auto-flag breaches when reading: keep simple — UI computes from sla_deadline vs now()
-- but maintain sla_breached on UPDATE for historical reporting
CREATE OR REPLACE FUNCTION public.update_inbox_sla_breached()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.resolved_at IS NULL
     AND NEW.sla_deadline IS NOT NULL
     AND NEW.sla_deadline < now() THEN
    NEW.sla_breached := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_update_breached ON public.inbox_messages;
CREATE TRIGGER trg_inbox_update_breached
  BEFORE UPDATE ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_inbox_sla_breached();