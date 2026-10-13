-- Complete a clinical encounter and its appointment atomically without signing the note.
CREATE OR REPLACE FUNCTION public.complete_careplus_encounter(p_encounter_id bigint)
RETURNS TABLE (encounter_id bigint, appointment_id bigint, encounter_status public.encounter_status, signed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_staff public.careplus_staff_users%ROWTYPE;
  v_encounter public.encounters%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_staff FROM public.careplus_staff_users
  WHERE auth_user_id = v_user_id AND active = true AND role = 'doctor' LIMIT 1;
  IF NOT FOUND OR v_staff.doctor_id IS NULL THEN
    RAISE EXCEPTION 'Active doctor access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_encounter FROM public.encounters
  WHERE encounters.encounter_id = p_encounter_id AND encounters.doctor_id = v_staff.doctor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encounter not found or not assigned to you' USING ERRCODE = 'P0002';
  END IF;
  IF v_encounter.status <> 'In Progress' THEN
    RAISE EXCEPTION 'Only in-progress encounters can be completed' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(BTRIM(v_encounter.assessment), '') IS NULL OR NULLIF(BTRIM(v_encounter.plan), '') IS NULL THEN
    RAISE EXCEPTION 'Save both the clinical assessment and plan before completing this encounter' USING ERRCODE = '22023';
  END IF;

  UPDATE public.encounters SET status = 'Completed', completed_at = now()
  WHERE encounters.encounter_id = p_encounter_id;

  IF v_encounter.appointment_id IS NOT NULL THEN
    UPDATE public.appointments SET appointment_status = 'Completed'
    WHERE appointments.appointment_id = v_encounter.appointment_id
      AND appointments.doctor_id = v_staff.doctor_id
      AND appointments.appointment_status = 'In Progress';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked appointment is not in progress; administrator review is required' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN QUERY SELECT v_encounter.encounter_id, v_encounter.appointment_id, 'Completed'::public.encounter_status, v_encounter.signed_at;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_careplus_encounter(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_careplus_encounter(bigint) TO authenticated, service_role;
