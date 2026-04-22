-- ============================================================================
-- Fix: Consolidate notification RPCs to single overload with text params
-- PostgREST passes text strings, not PostgreSQL enum types.
-- ============================================================================

-- 1. Drop ALL existing overloads of create_notification
DROP FUNCTION IF EXISTS public.create_notification(
  p_user_id uuid, p_title text, p_message text, p_type text, p_link text, p_data jsonb, p_serial text, p_form_code text, p_created_by uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.create_notification(
  p_user_id uuid, p_title text, p_message text, p_category notification_category, p_priority notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid
) CASCADE;

-- 2. Drop ALL existing overloads of create_notifications_batch
DROP FUNCTION IF EXISTS public.create_notifications_batch(
  p_user_ids uuid[], p_title text, p_message text, p_type text, p_link text, p_data jsonb, p_serial text, p_form_code text, p_created_by uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.create_notifications_batch(
  p_user_ids uuid[], p_title text, p_message text, p_category notification_category, p_priority notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid
) CASCADE;

-- 3. Create single create_notification with text params (casts internally)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id    uuid,
  p_title      text,
  p_message    text,
  p_category   text DEFAULT 'system',
  p_priority   text DEFAULT 'info',
  p_event_type text DEFAULT NULL,
  p_actor_id   uuid DEFAULT NULL,
  p_target_id  uuid DEFAULT NULL,
  p_link       text DEFAULT NULL,
  p_data       jsonb DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, category, priority, event_type,
    actor_id, target_id, link, data, created_by, read
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_category::notification_category,
    p_priority::notification_priority,
    p_event_type,
    p_actor_id,
    p_target_id,
    p_link,
    COALESCE(p_data, '{}'::jsonb),
    p_created_by,
    false
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- 4. Create single create_notifications_batch with text params
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids    uuid[],
  p_title      text,
  p_message     text,
  p_category   text DEFAULT 'system',
  p_priority   text DEFAULT 'info',
  p_event_type text DEFAULT NULL,
  p_actor_id   text DEFAULT NULL,
  p_target_id  text DEFAULT NULL,
  p_link       text DEFAULT NULL,
  p_data       jsonb DEFAULT NULL,
  p_created_by text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count integer := 0;
  uid uuid;
BEGIN
  FOREACH uid IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notifications (
      user_id, title, message, category, priority, event_type,
      actor_id, target_id, link, data, created_by, read
    ) VALUES (
      uid,
      p_title,
      p_message,
      p_category::notification_category,
      p_priority::notification_priority,
      p_event_type,
      p_actor_id::uuid,
      p_target_id::uuid,
      p_link,
      COALESCE(p_data, '{}'::jsonb),
      p_created_by::uuid,
      false
    );
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;

-- 5. Recreate emit_event to use the new batch function
CREATE OR REPLACE FUNCTION public.emit_event(
  p_title      text,
  p_message    text,
  p_category   text DEFAULT 'system',
  p_priority   text DEFAULT 'info',
  p_event_type text DEFAULT NULL,
  p_actor_id   uuid DEFAULT NULL,
  p_target_id  uuid DEFAULT NULL,
  p_link       text DEFAULT NULL,
  p_data       jsonb DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
  target_uid uuid;
BEGIN
  IF p_actor_id IS NOT NULL THEN
    target_uid := p_actor_id;
  ELSE
    SELECT user_id INTO target_uid FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;

  IF target_uid IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.notifications (
    user_id, title, message, category, priority, event_type,
    actor_id, target_id, link, data, created_by, read
  ) VALUES (
    target_uid,
    p_title,
    p_message,
    p_category::notification_category,
    p_priority::notification_priority,
    p_event_type,
    p_actor_id,
    p_target_id,
    p_link,
    COALESCE(p_data, '{}'::jsonb),
    p_created_by,
    false
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 6. Grant execution
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_event TO authenticated;