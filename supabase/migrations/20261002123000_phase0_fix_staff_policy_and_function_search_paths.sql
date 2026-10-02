-- CarePlus Phase 0: remove duplicate staff policy and pin function search paths.
DROP POLICY IF EXISTS "Staff can read own authorization record" ON public.careplus_staff_users;

ALTER FUNCTION public.calculate_age(date) SET search_path = public;
ALTER FUNCTION public.current_utc_timestamp() SET search_path = public;
ALTER FUNCTION public.enforce_payment_status_integrity() SET search_path = public;
ALTER FUNCTION public.generate_payment_reference() SET search_path = public;
ALTER FUNCTION public.get_available_slots(bigint) SET search_path = public;
ALTER FUNCTION public.get_branch_occupancy(bigint) SET search_path = public;
ALTER FUNCTION public.get_doctor_appointment_count(bigint) SET search_path = public;
ALTER FUNCTION public.get_doctor_appointments(bigint,date) SET search_path = public;
ALTER FUNCTION public.get_doctor_full_name(bigint) SET search_path = public;
ALTER FUNCTION public.get_patient_full_name(bigint) SET search_path = public;
ALTER FUNCTION public.is_branch_available(bigint) SET search_path = public;
ALTER FUNCTION public.is_doctor_available(bigint,date,time) SET search_path = public;
ALTER FUNCTION public.is_slot_available(bigint,date,time) SET search_path = public;
ALTER FUNCTION public.prevent_doctor_double_booking() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_patient_feedback_updated_at() SET search_path = public;
ALTER FUNCTION public.validate_appointment_status_transition() SET search_path = public;
ALTER FUNCTION public.validate_notification_status_transition() SET search_path = public;
ALTER FUNCTION public.n8n_trigger_function_dd870d54_d9a7_441d_a289_501b65183fd3() SET search_path = public;