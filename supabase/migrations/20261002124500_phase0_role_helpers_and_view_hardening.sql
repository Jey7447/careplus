-- Phase 0 role helpers and view hardening.
CREATE OR REPLACE FUNCTION public.current_careplus_staff()
RETURNS public.careplus_staff_users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.* FROM public.careplus_staff_users s
  WHERE s.auth_user_id = auth.uid() AND s.active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_careplus_role(required_role public.careplus_staff_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.careplus_staff_users s
    WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_careplus_any_role(required_roles public.careplus_staff_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.careplus_staff_users s
    WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = ANY(required_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_careplus_doctor_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.doctor_id FROM public.careplus_staff_users s
  WHERE s.auth_user_id = auth.uid() AND s.active = true
    AND s.role = 'doctor'::public.careplus_staff_role
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_careplus_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_careplus_staff() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_careplus_role(public.careplus_staff_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_careplus_role(public.careplus_staff_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_careplus_any_role(public.careplus_staff_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_careplus_any_role(public.careplus_staff_role[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_careplus_doctor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_careplus_doctor_id() TO authenticated, service_role;

-- These dashboard views no longer use SECURITY DEFINER.
DROP VIEW IF EXISTS public.vw_appointment_schedule;
DROP VIEW IF EXISTS public.vw_branch_capacity;
DROP VIEW IF EXISTS public.vw_doctor_workload;
DROP VIEW IF EXISTS public.vw_patient_history;

CREATE VIEW public.vw_appointment_schedule AS
SELECT a.appointment_id,a.patient_id,get_patient_full_name(a.patient_id) AS patient_name,
a.doctor_id,get_doctor_full_name(a.doctor_id) AS doctor_name,d.specialty,b.branch_name,
a.appointment_date,a.appointment_time,a.appointment_type,a.appointment_status,a.notes,a.created_at
FROM public.appointments a JOIN public.doctors d ON a.doctor_id=d.doctor_id
JOIN public.branches b ON a.branch_id=b.branch_id;

CREATE VIEW public.vw_branch_capacity AS
SELECT branch_id,branch_name,city,daily_capacity,current_bookings,
get_available_slots(branch_id) AS available_slots,get_branch_occupancy(branch_id) AS occupancy_percentage,active
FROM public.branches;

CREATE VIEW public.vw_doctor_workload AS
SELECT d.doctor_id,get_doctor_full_name(d.doctor_id) AS doctor_name,d.specialty,b.branch_name,
count(a.appointment_id) AS total_appointments,d.active
FROM public.doctors d LEFT JOIN public.appointments a ON d.doctor_id=a.doctor_id
LEFT JOIN public.branches b ON d.branch_id=b.branch_id
GROUP BY d.doctor_id,d.specialty,b.branch_name,d.active;

CREATE VIEW public.vw_patient_history AS
SELECT p.patient_id,get_patient_full_name(p.patient_id) AS patient_name,a.appointment_id,
a.appointment_date,a.appointment_time,a.appointment_status,get_doctor_full_name(d.doctor_id) AS doctor_name,
d.specialty,b.branch_name,lr.test_name,c.condition_name,c.severity,lr.result,lr.doctor_notes,
pay.amount,pay.payment_status,pay.payment_method
FROM public.patients p LEFT JOIN public.appointments a ON p.patient_id=a.patient_id
LEFT JOIN public.doctors d ON a.doctor_id=d.doctor_id LEFT JOIN public.branches b ON a.branch_id=b.branch_id
LEFT JOIN public.lab_results lr ON a.appointment_id=lr.appointment_id
LEFT JOIN public.conditions c ON lr.condition_id=c.condition_id
LEFT JOIN public.payments pay ON a.appointment_id=pay.appointment_id;