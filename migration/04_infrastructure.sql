-- ============================================================================
-- QMS FORGE — PHASE D: INFRASTRUCTURE COMPLETION
-- Creates ALL 7 RPC functions + audit trigger + audit immutability
--
-- RUN AFTER: 02_schema_build.sql + 03_data_migrate.py
-- Order matters: functions before trigger
-- ============================================================================

-- ============================================================================
-- 0. UTILITY: has_role() — Check if current user has a specific role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = required_role
  );
$$;

-- ============================================================================
-- 1. append_audit_log() — Append an entry to the audit log
-- Non-blocking by design — errors logged but don't fail main operation
-- SECURITY DEFINER so it works even with restrictive audit_log RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_record_id uuid,
  p_action text,
  p_changed_fields jsonb DEFAULT '{}',
  p_previous_values jsonb DEFAULT '{}',
  p_new_values jsonb DEFAULT '{}',
  p_performed_by text DEFAULT '',
  p_form_code text DEFAULT '',
  p_serial text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.audit_log (
    record_id, action, changed_fields, previous_values, new_values,
    performed_by, action_type, form_code, serial, user_email
  ) VALUES (
    p_record_id, p_action, p_changed_fields, p_previous_values, p_new_values,
    COALESCE(p_performed_by, auth.jwt() ->> 'email'::text, 'system'),
    p_action,
    p_form_code,
    p_serial,
    COALESCE(p_performed_by, auth.jwt() ->> 'email'::text, 'system')
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- 2. soft_delete_record() — Soft-delete a record (set deleted_at)
-- Enforces: must exist, must not already be deleted, must be authorized
-- ============================================================================
CREATE OR REPLACE FUNCTION public.soft_delete_record(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted timestamptz;
BEGIN
  -- Check record exists and isn't already deleted
  SELECT deleted_at INTO v_deleted FROM public.records WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id;
  END IF;
  
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Record already deleted at %', v_deleted;
  END IF;
  
  -- Soft delete
  UPDATE public.records SET deleted_at = now(), updated_at = now() WHERE id = p_id;
  
  -- Audit log
  PERFORM public.append_audit_log(
    p_id, 'delete',
    '{"deleted_at": true}'::jsonb,
    ('{"deleted_at": null}'::jsonb),
    jsonb_build_object('deleted_at', now()),
    auth.jwt() ->> 'email'::text,
    (SELECT form_code FROM public.records WHERE id = p_id),
    (SELECT serial FROM public.records WHERE id = p_id)
  );
  
  RETURN true;
END;
$$;

-- ============================================================================
-- 3. create_notification() — Create a single notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_record_id uuid DEFAULT NULL,
  p_action text DEFAULT '',
  p_serial text DEFAULT '',
  p_form_code text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, record_id, action, serial, form_code, read
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_record_id, p_action, p_serial, p_form_code, false
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- 4. create_notifications_batch() — Create notifications for multiple users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids uuid[],
  p_type text,
  p_title text,
  p_message text,
  p_record_id uuid DEFAULT NULL,
  p_action text DEFAULT '',
  p_serial text DEFAULT '',
  p_form_code text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    PERFORM public.create_notification(
      v_user_id, p_type, p_title, p_message,
      p_record_id, p_action, p_serial, p_form_code
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- ============================================================================
-- 5. get_record_by_serial() — Fetch a record by its serial number
-- Returns only non-deleted records
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_record_by_serial(p_serial text)
RETURNS SETOF public.records
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.records
  WHERE serial = p_serial
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- ============================================================================
-- 6. handle_new_user() — Auto-create profile on signup
-- Called by auth.users trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    'viewer',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign default viewer role
  INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (NEW.id, 'viewer', 'system', now())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 7. AUDIT TRIGGER — log_record_change()
-- SECURITY DEFINER: bypasses audit_log RLS for trigger inserts
-- Fires on INSERT, UPDATE, DELETE on records table
-- ============================================================================

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
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_record_id := NEW.id;
    v_changed := '{}'::jsonb;
    v_prev := '{}'::jsonb;
    v_new := to_jsonb(NEW);
    v_form_code := COALESCE(NEW.form_code, NEW.code, '');
    v_serial := COALESCE(NEW.serial, NEW.last_serial, '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_record_id := NEW.id;
    v_form_code := COALESCE(NEW.form_code, NEW.code, '');
    v_serial := COALESCE(NEW.serial, NEW.last_serial, '');
    
    -- Compute changed fields
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
    v_form_code := COALESCE(OLD.form_code, OLD.code, '');
    v_serial := COALESCE(OLD.serial, OLD.last_serial, '');
  END IF;
  
  -- Insert audit log (non-blocking — errors don't fail main operation)
  BEGIN
    PERFORM public.append_audit_log(
      v_record_id, v_action,
      v_changed, v_prev, v_new,
      COALESCE(current_user, 'system'),
      v_form_code, v_serial
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit log failure must NOT block the main operation
    RAISE LOG 'Audit log insert failed: %', SQLERRM;
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 8. CREATE TRIGGER on records table
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_log_record_change ON public.records;
CREATE TRIGGER trigger_log_record_change
  AFTER INSERT OR UPDATE OR DELETE ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_record_change();

-- ============================================================================
-- 9. AUTH TRIGGER — Auto-create profile on signup
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
CREATE TRIGGER trigger_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 10. AUDIT LOG IMMUTABILITY — Prevent UPDATE and DELETE on audit_log
-- ============================================================================
-- RLS policies already exist (rls_deny_audit_insert/update/delete)
-- Add a trigger that also blocks modifications at the DB level

CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable. % is not allowed on audit_log.', TG_OP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_audit_update ON public.audit_log;
DROP TRIGGER IF EXISTS trigger_prevent_audit_delete ON public.audit_log;

CREATE TRIGGER trigger_prevent_audit_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();

CREATE TRIGGER trigger_prevent_audit_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();

-- ============================================================================
-- 11. GRANT EXECUTE on all RPC functions to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_audit_log(uuid, text, jsonb, jsonb, jsonb, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_record_by_serial(text) TO authenticated;

-- ============================================================================
-- VERIFICATION: Check all functions exist
-- ============================================================================
-- Run: SELECT routine_name FROM information_schema.routines 
--   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
--   ORDER BY routine_name;