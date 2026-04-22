-- Step 3: Tenant Identity System
-- Single-row settings table for company identity.
-- Only admins can write. All authenticated can read.

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  company_logo_url text NOT NULL DEFAULT '',
  theme_color text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid DEFAULT NULL
);

-- Insert the singleton row with defaults (empty = not configured)
INSERT INTO public.tenant_settings (company_name, company_logo_url, theme_color)
VALUES ('', '', '')
ON CONFLICT (id) DO NOTHING;

-- Prevent more than one row via trigger
CREATE OR REPLACE FUNCTION public.enforce_singleton_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  row_count integer;
BEGIN
  SELECT count(*) INTO row_count FROM public.tenant_settings;
  IF row_count > 1 THEN
    DELETE FROM public.tenant_settings WHERE id != (SELECT MIN(id) FROM public.tenant_settings);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_enforce_singleton_tenant
  AFTER INSERT ON public.tenant_settings
  FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_singleton_tenant();

-- RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read tenant settings (needed for UI rendering)
CREATE POLICY "Authenticated users can read tenant settings"
  ON public.tenant_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update tenant settings
CREATE POLICY "Only admins can update tenant settings"
  ON public.tenant_settings FOR UPDATE
  TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Only admins can insert (for initial setup)
CREATE POLICY "Only admins can insert tenant settings"
  ON public.tenant_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role('admin'));

-- Anon blocked
CREATE POLICY "Anon cannot access tenant settings"
  ON public.tenant_settings FOR ALL
  TO anon
  USING (false) WITH CHECK (false);

-- Trigger to update updated_at on change
CREATE OR REPLACE FUNCTION public.set_tenant_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_set_tenant_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_updated_at();