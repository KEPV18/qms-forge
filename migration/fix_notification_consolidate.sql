-- Resolve PostgREST overload ambiguity by consolidating create_notification
-- to a single function with all parameters as optional defaults.
-- Also consolidate create_notifications_batch.

-- Drop all existing overloads of create_notification
DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, text, jsonb, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, text, jsonb, text, text) CASCADE;

-- Single consolidated create_notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL,
  p_serial text DEFAULT NULL,
  p_form_code text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_data jsonb;
BEGIN
  -- Embed serial and form_code into the data JSONB if provided
  v_data := COALESCE(p_data, '{}'::jsonb);
  IF p_serial IS NOT NULL THEN
    v_data := jsonb_set(v_data, '{serial}', to_jsonb(p_serial));
  END IF;
  IF p_form_code IS NOT NULL THEN
    v_data := jsonb_set(v_data, '{formCode}', to_jsonb(p_form_code));
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, data, created_by, read
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_link, v_data, p_created_by, false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Drop all existing overloads of create_notifications_batch
DROP FUNCTION IF EXISTS public.create_notifications_batch(uuid[], text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_notifications_batch(uuid[], text, text, text, text, jsonb, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_notifications_batch(uuid[], text, text, text, text, jsonb, text, text) CASCADE;

-- Single consolidated create_notifications_batch
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids uuid[],
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL,
  p_serial text DEFAULT NULL,
  p_form_code text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    PERFORM public.create_notification(
      v_user_id, p_title, p_message, p_type,
      p_link, p_data, p_serial, p_form_code, p_created_by
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;