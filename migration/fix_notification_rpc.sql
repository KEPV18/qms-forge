-- Fix: Drop broken create_notification overload #3 and create_notifications_batch #3
-- These reference legacy columns (record_id, action, serial, form_code) that
-- were dropped from the notifications table during cutover.
-- The first two overloads (4-arg and 7-arg) work correctly.

-- Drop the broken 3rd overload of create_notification
DROP FUNCTION IF EXISTS public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_message text,
  p_record_id uuid, p_action text, p_serial text, p_form_code text
) CASCADE;

-- Drop the broken 3rd overload of create_notifications_batch
-- (it calls the broken create_notification overload)
DROP FUNCTION IF EXISTS public.create_notifications_batch(
  p_user_ids uuid[], p_type text, p_title text, p_message text,
  p_record_id uuid, p_action text, p_serial text, p_form_code text
) CASCADE;

-- Rebuild create_notification #3 with correct schema
-- Uses the current notifications columns: user_id, title, message, type, link, data, created_by, read
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL,
  p_serial text DEFAULT NULL,
  p_form_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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
    user_id, type, title, message, link, data, read
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_link, v_data, false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Rebuild create_notifications_batch #3 with correct schema
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids uuid[],
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL,
  p_serial text DEFAULT NULL,
  p_form_code text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    PERFORM public.create_notification(
      v_user_id, p_type, p_title, p_message,
      p_link, p_data, p_serial, p_form_code
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;