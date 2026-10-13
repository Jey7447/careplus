-- Start a clinical encounter atomically from an assigned doctor's checked-in appointment.
-- Idempotent: retries return the existing encounter instead of creating a duplicate.
CREATE OR REPLACE FUNCTION public.start_careplus_encounter(p_appointment_id bigint)
RETURNS TABLE (encounter_id bigint, appointment_id bigint, encounter_status public.encounter_status, created_now boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_staff public.careplus_staff_users%ROWTYPE;
  v_appointment public.appointments%ROWTYPE;
  v_encounter public.encounters%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_staff
  FROM public.careplus_staff_users
  WHERE auth_user_id = v_user_id AND active = true AND role = 'doctor'
  LIMIT 1;

  IF NOT FOUND OR v_staff.doctor_id IS NULL THEN
    RAISE EXCEPTION 'Active doctor access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE appointments.appointment_id = p_appointment_id
    AND appointments.doctor_id = v_staff.doctor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not assigned to you' USING ERRCODE = 'P0002';
  END IF;

  IF v_appointment.appointment_status NOT IN ('Checked In', 'In Progress') THEN
    RAISE EXCEPTION 'Only checked-in or already in-progress appointments can start an encounter' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_encounter
  FROM public.encounters
  WHERE encounters.appointment_id = p_appointment_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_encounter.doctor_id <> v_staff.doctor_id
       OR v_encounter.patient_id <> v_appointment.patient_id THEN
      RAISE EXCEPTION 'Existing encounter does not match this assigned appointment' USING ERRCODE = '23514';
    END IF;
    IF v_encounter.status = 'Cancelled' THEN
      RAISE EXCEPTION 'This appointment is linked to a cancelled encounter; administrator review is required' USING ERRCODE = '22023';
    END IF;

    IF v_appointment.appointment_status = 'Checked In' THEN
      UPDATE public.appointments
      SET appointment_status = 'In Progress'
      WHERE appointments.appointment_id = p_appointment_id;
    END IF;

    RETURN QUERY SELECT v_encounter.encounter_id, p_appointment_id, v_encounter.status, false;
    RETURN;
  END IF;

  INSERT INTO public.encounters (
    appointment_id, patient_id, doctor_id, branch_id, encounter_type,
    status, chief_complaint, started_at
  ) VALUES (
    v_appointment.appointment_id,
    v_appointment.patient_id,
    v_staff.doctor_id,
    v_appointment.branch_id,
    v_appointment.appointment_type,
    'In Progress',
    NULLIF(BTRIM(v_appointment.reason_for_visit), ''),
    now()
  )
  RETURNING * INTO v_encounter;

  UPDATE public.appointments
  SET appointment_status = 'In Progress'
  WHERE appointments.appointment_id = p_appointment_id;

  RETURN QUERY SELECT v_encounter.encounter_id, p_appointment_id, v_encounter.status, true;
END;
$$;

REVOKE ALL ON FUNCTION public.start_careplus_encounter(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_careplus_encounter(bigint) TO authenticated, service_role;
