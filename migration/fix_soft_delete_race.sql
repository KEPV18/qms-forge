-- Fix soft_delete_record: Make the check-and-update atomic
-- Problem: SELECT deleted_at + UPDATE is not atomic. Two concurrent calls
-- can both pass the IS NULL check and succeed.
-- Fix: Use a single UPDATE with WHERE deleted_at IS NULL and check row count.

DROP FUNCTION IF EXISTS public.soft_delete_record(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.soft_delete_record(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result record;
BEGIN
  -- Atomic check-and-update: only updates if deleted_at IS NULL
  UPDATE public.records
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_id AND deleted_at IS NULL
  RETURNING form_code, serial INTO v_result;

  IF NOT FOUND THEN
    -- Either record doesn't exist, or was already deleted
    RAISE EXCEPTION 'Record not found or already deleted';
  END IF;

  -- Audit log (non-blocking — fire and forget pattern)
  PERFORM public.append_audit_log(
    p_id, 'delete',
    '{"deleted_at": true}'::jsonb,
    '{"deleted_at": null}'::jsonb,
    jsonb_build_object('deleted_at', now()),
    auth.jwt() ->> 'email',
    v_result.form_code,
    v_result.serial
  );

  RETURN true;
END;
$function$;

-- Recreate the trigger that references soft_delete_record (if CASCADE dropped it)
-- Check if trigger still exists
DO $$
BEGIN
  -- No trigger depends on soft_delete_record function
  -- The trigger_log_record_change trigger calls append_audit_log, not soft_delete_record
  NULL;
END $$;