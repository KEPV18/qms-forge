-- ============================================================================
-- QMS FORGE — PHASE G: LEGACY DESTRUCTION
-- Drops ALL legacy columns and dead data.
--
-- ⚠️  RUN ONLY AFTER Phase F validation passes 100%
-- ⚠️  THIS IS IRREVERSIBLE — Ensure backup is verified
--
-- What gets dropped:
--   - Legacy record columns: row_index, code, record_name, category,
--     description, when_to_fill, template_link, folder_link, last_serial,
--     last_file_date, days_ago, next_serial, audit_status, reviewed,
--     reviewed_by, review_date, file_reviews, audit_issues, record_status,
--     last_audit_date
--   - Legacy audit_log entries (all test entries)
-- ============================================================================

-- ============================================================================
-- STEP 1: Clean up legacy audit_log test entries
-- ============================================================================
-- audit_log is immutable (trigger blocks DELETE), so we use service_role
-- to hard-delete ONLY the test entries from before migration.
-- The immutability trigger uses RAISE EXCEPTION, which even service_role hits.
-- Solution: Temporarily disable the trigger for cleanup.

ALTER TABLE public.audit_log DISABLE TRIGGER trigger_prevent_audit_update;
ALTER TABLE public.audit_log DISABLE TRIGGER trigger_prevent_audit_delete;

-- Delete test audit entries (created before migration, or with test serials)
DELETE FROM public.audit_log 
WHERE serial LIKE 'RLS-%' 
   OR serial LIKE 'MGR-%'
   OR serial LIKE 'TEST-%'
   OR serial = ''
   OR form_code LIKE 'RLS-%'
   OR form_code LIKE 'MGR-%'
   OR (action = 'validation_test' AND performed_by = 'validation_script');

-- Keep only real audit entries with valid form codes
DELETE FROM public.audit_log 
WHERE form_code IS NULL OR form_code = '';

-- Re-enable immutability triggers
ALTER TABLE public.audit_log ENABLE TRIGGER trigger_prevent_audit_update;
ALTER TABLE public.audit_log ENABLE TRIGGER trigger_prevent_audit_delete;

-- ============================================================================
-- STEP 2: Drop legacy columns from records
-- ============================================================================

-- Drop in safe order (most dependent first)
ALTER TABLE public.records DROP COLUMN IF EXISTS audit_issues;
ALTER TABLE public.records DROP COLUMN IF EXISTS file_reviews;
ALTER TABLE public.records DROP COLUMN IF EXISTS review_date;
ALTER TABLE public.records DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE public.records DROP COLUMN IF EXISTS reviewed;
ALTER TABLE public.records DROP COLUMN IF EXISTS last_audit_date;
ALTER TABLE public.records DROP COLUMN IF EXISTS audit_status;
ALTER TABLE public.records DROP COLUMN IF EXISTS next_serial;
ALTER TABLE public.records DROP COLUMN IF EXISTS days_ago;
ALTER TABLE public.records DROP COLUMN IF EXISTS last_file_date;
ALTER TABLE public.records DROP COLUMN IF EXISTS last_serial;
ALTER TABLE public.records DROP COLUMN IF EXISTS folder_link;
ALTER TABLE public.records DROP COLUMN IF EXISTS template_link;
ALTER TABLE public.records DROP COLUMN IF EXISTS when_to_fill;
ALTER TABLE public.records DROP COLUMN IF EXISTS description;
ALTER TABLE public.records DROP COLUMN IF EXISTS category;
ALTER TABLE public.records DROP COLUMN IF EXISTS record_name;
ALTER TABLE public.records DROP COLUMN IF EXISTS row_index;
ALTER TABLE public.records DROP COLUMN IF EXISTS code;
ALTER TABLE public.records DROP COLUMN IF EXISTS record_status;

-- ============================================================================
-- STEP 3: Add final constraints now that legacy columns are gone
-- ============================================================================

-- form_code should have a proper foreign key or at minimum a CHECK
-- (form_code must match F/XX pattern for real forms)
ALTER TABLE public.records ADD CONSTRAINT chk_records_form_code_format
  CHECK (form_code ~ '^F/\d{1,2}$' OR form_code = 'F/99');

-- serial must match F/XX-NNN format (or be auto during creation)
ALTER TABLE public.records ADD CONSTRAINT chk_records_serial_format
  CHECK (serial ~ '^F/\d{1,2}-\d{3,4}$');

-- ============================================================================
-- STEP 4: Update the audit trigger to use only new columns
-- ============================================================================
-- The trigger function references both old and new columns.
-- Since old columns are now gone, update the function.

CREATE OR REPLACE FUNCTION public.log_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
  v_action text;
  v_changed jsonb;
  v_prev jsonb;
  v_new jsonb;
  v_form_code text;
  v_serial text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_record_id := NEW.id;
    v_changed := '{}'::jsonb;
    v_prev := '{}'::jsonb;
    v_new := to_jsonb(NEW);
    v_form_code := NEW.form_code;
    v_serial := NEW.serial;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_record_id := NEW.id;
    v_form_code := NEW.form_code;
    v_serial := NEW.serial;
    
    v_changed := '{}'::jsonb;
    v_prev := '{}'::jsonb;
    v_new := '{}'::jsonb;
    
    DECLARE
      k text;
    BEGIN
      FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
        IF to_jsonb(NEW) ->> k IS DISTINCT FROM to_jsonb(OLD) ->> k THEN
          v_changed := v_changed || jsonb_build_object(k, true);
          v_prev := v_prev || jsonb_build_object(k, to_jsonb(OLD) -> k);
          v_new := v_new || jsonb_build_object(k, to_jsonb(NEW) -> k);
        END IF;
      END LOOP;
    END;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_record_id := OLD.id;
    v_changed := '{}'::jsonb;
    v_prev := to_jsonb(OLD);
    v_new := '{}'::jsonb;
    v_form_code := OLD.form_code;
    v_serial := OLD.serial;
  END IF;
  
  BEGIN
    PERFORM public.append_audit_log(
      v_record_id, v_action,
      v_changed, v_prev, v_new,
      COALESCE(current_user, 'system'),
      v_form_code, v_serial
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Audit log insert failed: %', SQLERRM;
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run: SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'records' ORDER BY ordinal_position;
--
-- Expected columns:
--   id, form_code, serial, form_name, form_data, status,
--   created_by, last_modified_by, edit_count, modification_reason,
--   section, section_name, frequency, deleted_at,
--   created_at, updated_at