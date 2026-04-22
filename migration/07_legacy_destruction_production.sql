-- ============================================================================
-- QMS FORGE — PHASE G: LEGACY DESTRUCTION (PRODUCTION RUN)
-- ⚠️  IRREVERSIBLE — Run ONLY after Phase F validation passes AND frontend cutover is verified
-- ============================================================================

-- STEP 0: Pre-destruction snapshot
SELECT 'BEFORE: ' || count(*) || ' records, ' || 
  (SELECT count(*) FROM audit_log) || ' audit_log entries' as status
FROM records WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 1: Clean up any remaining test/junk data in audit_log
-- ============================================================================
ALTER TABLE public.audit_log DISABLE TRIGGER trigger_prevent_audit_update;
ALTER TABLE public.audit_log DISABLE TRIGGER trigger_prevent_audit_delete;

-- Remove entries with null form_code/serial (pre-migration trigger entries)
DELETE FROM public.audit_log WHERE form_code IS NULL OR serial IS NULL;

-- Remove test entries
DELETE FROM public.audit_log WHERE form_code LIKE 'RLS-%' OR form_code LIKE 'MGR-%';

ALTER TABLE public.audit_log ENABLE TRIGGER trigger_prevent_audit_update;
ALTER TABLE public.audit_log ENABLE TRIGGER trigger_prevent_audit_delete;

-- ============================================================================
-- STEP 2: Remove F/99 SECURITY_TEST record (not a real business record)
-- ============================================================================
ALTER TABLE public.records DISABLE TRIGGER trigger_log_record_change;
DELETE FROM public.records WHERE serial = 'F/99' AND form_name = 'SECURITY_TEST';
ALTER TABLE public.records ENABLE TRIGGER trigger_log_record_change;

-- ============================================================================
-- STEP 3: Drop legacy unique constraint on 'code' column
-- ============================================================================
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_code_key;

-- ============================================================================
-- STEP 4: Drop ALL legacy columns from records
-- ============================================================================
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
ALTER TABLE public.records DROP COLUMN IF EXISTS code;
ALTER TABLE public.records DROP COLUMN IF EXISTS row_index;
ALTER TABLE public.records DROP COLUMN IF EXISTS record_status;

-- ============================================================================
-- STEP 5: Update trigger function — remove legacy column references
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_record_change()
RETURNS TRIGGER
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
-- STEP 6: Verification
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'records' AND table_schema = 'public'
ORDER BY ordinal_position;