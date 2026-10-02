-- Make dashboard views honor the querying user's RLS policies.
ALTER VIEW public.vw_appointment_schedule SET (security_invoker = true);
ALTER VIEW public.vw_branch_capacity SET (security_invoker = true);
ALTER VIEW public.vw_doctor_workload SET (security_invoker = true);
ALTER VIEW public.vw_patient_history SET (security_invoker = true);