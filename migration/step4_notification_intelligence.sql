-- ============================================================================
-- QMS Forge — Event Intelligence & Notification System Migration
-- Extends notifications table with structured event classification
-- ============================================================================

-- 1. Create enums
CREATE TYPE public.notification_category AS ENUM (
  'records', 'users', 'security', 'system', 'tenant'
);

CREATE TYPE public.notification_priority AS ENUM (
  'critical', 'important', 'info'
);

-- 2. Add new columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category public.notification_category DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS priority public.notification_priority DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actor_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_id uuid DEFAULT NULL;

-- 3. Update existing rows — classify by current type field
UPDATE public.notifications SET
  category = CASE
    WHEN type = 'issue' THEN 'records'::public.notification_category
    WHEN type = 'approval' THEN 'records'::public.notification_category
    WHEN type = 'system' THEN 'system'::public.notification_category
    WHEN type = 'security' THEN 'security'::public.notification_category
    ELSE 'system'::public.notification_category
  END,
  priority = CASE
    WHEN type = 'issue' THEN 'critical'::public.notification_priority
    WHEN type = 'approval' THEN 'important'::public.notification_priority
    ELSE 'info'::public.notification_priority
  END;

-- Remove the type default so we rely on category+event_type going forward
ALTER TABLE public.notifications ALTER COLUMN type DROP DEFAULT;

-- 4. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON public.notifications (user_id, category);

CREATE INDEX IF NOT EXISTS idx_notifications_user_priority
  ON public.notifications (user_id, priority);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications (user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- 5. Recreate create_notification RPC with new fields
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_category public.notification_category DEFAULT 'system',
  p_priority public.notification_priority DEFAULT 'info',
  p_event_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, category, priority, event_type,
    title, message, link, data,
    actor_id, target_id, created_by, read
  ) VALUES (
    p_user_id, p_category, p_priority, p_event_type,
    p_title, p_message, p_link, COALESCE(p_data, '{}'::jsonb),
    p_actor_id, p_target_id, p_created_by, false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 6. Recreate create_notifications_batch with new fields
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids uuid[],
  p_title text,
  p_message text,
  p_category public.notification_category DEFAULT 'system',
  p_priority public.notification_priority DEFAULT 'info',
  p_event_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL,
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
      v_user_id, p_title, p_message, p_category, p_priority,
      p_event_type, p_actor_id, p_target_id,
      p_link, p_data, p_created_by
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- 7. Convenience: create notification for all admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title text,
  p_message text,
  p_category public.notification_category DEFAULT 'system',
  p_priority public.notification_priority DEFAULT 'info',
  p_event_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_ids uuid[];
BEGIN
  SELECT array_agg(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin';

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

  RETURN public.create_notifications_batch(
    v_admin_ids, p_title, p_message, p_category, p_priority,
    p_event_type, p_actor_id, p_target_id,
    p_link, p_data, auth.uid()
  );
END;
$function$;

-- 8. Convenience: create notification for all managers + admins
CREATE OR REPLACE FUNCTION public.notify_leadership(
  p_title text,
  p_message text,
  p_category public.notification_category DEFAULT 'records',
  p_priority public.notification_priority DEFAULT 'important',
  p_event_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(user_id) INTO v_ids
  FROM public.user_roles
  WHERE role IN ('admin', 'manager');

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

  RETURN public.create_notifications_batch(
    v_ids, p_title, p_message, p_category, p_priority,
    p_event_type, p_actor_id, p_target_id,
    p_link, p_data, auth.uid()
  );
END;
$function$;