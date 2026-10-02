-- CarePlus Phase 0: identity and security hardening
-- Establishes the staff-to-doctor relationship needed for role-scoped clinical access.
ALTER TABLE public.careplus_staff_users
  ADD COLUMN IF NOT EXISTS doctor_id bigint
  REFERENCES public.doctors(doctor_id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS careplus_staff_doctor_unique
  ON public.careplus_staff_users (doctor_id)
  WHERE doctor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS careplus_staff_doctor_id_idx
  ON public.careplus_staff_users (doctor_id)
  WHERE doctor_id IS NOT NULL;

-- Trigger-only functions must not be callable through the public REST/RPC surface.
REVOKE ALL ON FUNCTION public.audit_appointment_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_appointment_changes() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.create_appointment_rescheduled_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment_rescheduled_notifications() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.create_feedback_request_on_completion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_feedback_request_on_completion() TO postgres, service_role;

-- Admin appointment creation remains callable by authenticated users because the
-- function itself enforces is_careplus_admin(). Anonymous access is removed.
REVOKE EXECUTE ON FUNCTION public.create_admin_appointment(bigint,text,text,text,date,gender_type,text,text,text,text,bigint,date,time,appointment_type,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_appointment(bigint,text,text,text,date,time,appointment_type,text,text) TO authenticated, service_role;

-- Admin-only dashboard statistics: authenticated access is retained for the app,
-- while the function itself now enforces the admin role.
CREATE OR REPLACE FUNCTION public.get_feedback_triage_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_careplus_admin() THEN
    RAISE EXCEPTION 'Administrator access required.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT json_build_object(
      'normal', count(*) FILTER (WHERE triage_status = 'normal'),
      'follow_up', count(*) FILTER (WHERE triage_status = 'follow_up'),
      'critical', count(*) FILTER (WHERE triage_status = 'critical'),
      'needs_attention', count(*) FILTER (WHERE triage_status IN ('follow_up', 'critical'))
    )
    FROM public.patient_feedback
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_triage_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_triage_dashboard_stats() TO authenticated, service_role;

-- Role-check helper is an internal authenticated-user helper, not an anonymous RPC.
REVOKE EXECUTE ON FUNCTION public.is_careplus_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_careplus_admin() TO authenticated, service_role;

-- get_feedback_request(uuid) and submit_patient_feedback(...) intentionally remain
-- public because they support the tokenized patient feedback flow.
