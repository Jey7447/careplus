CREATE OR REPLACE FUNCTION public.claim_notification_dispatch(
  p_notification_id bigint,
  p_worker_id text
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_notification public.notifications;
BEGIN
  IF p_notification_id IS NULL THEN
    RAISE EXCEPTION 'notification_id is required';
  END IF;

  IF nullif(trim(coalesce(p_worker_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  UPDATE public.notifications n
  SET
    dispatch_attempts = COALESCE(n.dispatch_attempts, 0) + 1,
    last_dispatch_attempt_at = now(),
    dispatch_locked_at = now(),
    dispatch_locked_by = p_worker_id,
    dispatch_last_error = NULL
  WHERE n.notification_id = p_notification_id
    AND n.status = 'Pending'::public.notification_status
    AND n.channel IN (
      'SMS'::public.notification_channel,
      'Email'::public.notification_channel
    )
    AND (
      n.dispatch_locked_at IS NULL
      OR n.dispatch_locked_at < now() - interval '15 minutes'
      OR n.dispatch_locked_by = p_worker_id
    )
  RETURNING n.* INTO v_notification;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification % is not pending or is currently locked by another worker', p_notification_id;
  END IF;

  RETURN v_notification;
END;
$function$;
