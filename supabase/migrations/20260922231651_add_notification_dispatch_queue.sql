ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dispatch_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dispatch_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_locked_by text,
  ADD COLUMN IF NOT EXISTS dispatch_last_error text;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_dispatch_attempts_nonnegative;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_dispatch_attempts_nonnegative
  CHECK (dispatch_attempts >= 0);

CREATE INDEX IF NOT EXISTS idx_notifications_dispatch_queue
  ON public.notifications (notification_id)
  WHERE status = 'Pending'::public.notification_status
    AND channel IN ('SMS'::public.notification_channel, 'Email'::public.notification_channel);

CREATE OR REPLACE FUNCTION public.claim_notification_dispatch_batch(
  p_worker_id text,
  p_notification_types text[],
  p_limit integer DEFAULT 20
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF nullif(trim(coalesce(p_worker_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  IF p_notification_types IS NULL OR cardinality(p_notification_types) = 0 THEN
    RAISE EXCEPTION 'notification_types are required';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'limit must be between 1 and 100';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT n.notification_id
    FROM public.notifications n
    WHERE n.status = 'Pending'::public.notification_status
      AND n.channel IN ('SMS'::public.notification_channel, 'Email'::public.notification_channel)
      AND n.notification_type = ANY (p_notification_types)
      AND (
        n.dispatch_locked_at IS NULL
        OR n.dispatch_locked_at < now() - interval '15 minutes'
      )
    ORDER BY n.notification_id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.notifications n
    SET
      dispatch_attempts = n.dispatch_attempts + 1,
      last_dispatch_attempt_at = now(),
      dispatch_locked_at = now(),
      dispatch_locked_by = p_worker_id,
      dispatch_last_error = NULL
    FROM candidates c
    WHERE n.notification_id = c.notification_id
    RETURNING n.*
  )
  SELECT * FROM claimed
  ORDER BY notification_id ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_notification_dispatch(
  p_notification_id bigint,
  p_worker_id text,
  p_status public.notification_status,
  p_twilio_message_sid text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_notification public.notifications;
BEGIN
  IF nullif(trim(coalesce(p_worker_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  IF p_status NOT IN (
    'Sent'::public.notification_status,
    'Failed'::public.notification_status
  ) THEN
    RAISE EXCEPTION 'dispatch finalization only supports Sent or Failed';
  END IF;

  UPDATE public.notifications n
  SET
    status = p_status,
    sent_at = CASE
      WHEN p_status = 'Sent'::public.notification_status THEN coalesce(n.sent_at, now())
      ELSE n.sent_at
    END,
    twilio_message_sid = coalesce(p_twilio_message_sid, n.twilio_message_sid),
    dispatch_locked_at = NULL,
    dispatch_locked_by = NULL,
    dispatch_last_error = CASE
      WHEN p_status = 'Failed'::public.notification_status THEN nullif(trim(p_error), '')
      ELSE NULL
    END
  WHERE n.notification_id = p_notification_id
    AND n.status = 'Pending'::public.notification_status
    AND n.dispatch_locked_by = p_worker_id
  RETURNING n.* INTO v_notification;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification % is not pending or is not locked by worker %', p_notification_id, p_worker_id;
  END IF;

  RETURN v_notification;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_notification_dispatch_batch(text, text[], integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_notification_dispatch(bigint, text, public.notification_status, text, text) FROM PUBLIC;
