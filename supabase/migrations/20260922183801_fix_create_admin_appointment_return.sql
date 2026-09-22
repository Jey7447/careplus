create or replace function public.create_admin_appointment(
  p_patient_id bigint default null,
  p_first_name text default null,
  p_last_name text default null,
  p_phone_number text default null,
  p_date_of_birth date default null,
  p_gender public.gender_type default null,
  p_email text default null,
  p_address text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_phone text default null,
  p_doctor_id bigint default null,
  p_appointment_date date default null,
  p_appointment_time time without time zone default null,
  p_appointment_type public.appointment_type default 'Consultation',
  p_reason_for_visit text default null,
  p_notes text default null
)
returns table (
  appointment_id bigint,
  patient_id bigint,
  doctor_id bigint,
  branch_id bigint,
  appointment_date date,
  appointment_time time without time zone,
  appointment_type public.appointment_type,
  appointment_status public.appointment_status,
  patient_created boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_patient_id bigint;
  v_patient_created boolean := false;
  v_doctor_branch_id bigint;
  v_appointment_id bigint;
  v_appointment_type public.appointment_type;
  v_appointment_status public.appointment_status := 'Scheduled'::public.appointment_status;
begin
  if not public.is_careplus_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  if p_doctor_id is null or p_appointment_date is null or p_appointment_time is null then
    raise exception 'Doctor, appointment date and appointment time are required.' using errcode = '22023';
  end if;

  if (p_appointment_date::timestamp + p_appointment_time) <= (now() at time zone 'Africa/Lagos') then
    raise exception 'The appointment time must be in the future.' using errcode = '22023';
  end if;

  select d.branch_id
  into v_doctor_branch_id
  from public.doctors as d
  where d.doctor_id = p_doctor_id
    and d.active = true;

  if v_doctor_branch_id is null then
    raise exception 'Selected doctor was not found or is inactive.' using errcode = '22023';
  end if;

  if p_patient_id is not null then
    select p.patient_id
    into v_patient_id
    from public.patients as p
    where p.patient_id = p_patient_id;

    if v_patient_id is null then
      raise exception 'Selected patient was not found.' using errcode = '22023';
    end if;
  else
    if nullif(trim(coalesce(p_first_name, '')), '') is null
       or nullif(trim(coalesce(p_last_name, '')), '') is null
       or nullif(trim(coalesce(p_phone_number, '')), '') is null
       or p_date_of_birth is null
       or p_gender is null
       or nullif(trim(coalesce(p_address, '')), '') is null then
      raise exception 'First name, last name, phone number, date of birth, gender and address are required for a new patient.' using errcode = '22023';
    end if;

    select p.patient_id
    into v_patient_id
    from public.patients as p
    where regexp_replace(p.phone_number, '\D', '', 'g') = regexp_replace(trim(p_phone_number), '\D', '', 'g')
    order by p.patient_id
    limit 1;

    if v_patient_id is not null then
      raise exception 'A patient with this phone number already exists. Select the existing patient instead.' using errcode = '23505';
    end if;

    insert into public.patients (
      first_name,
      last_name,
      phone_number,
      date_of_birth,
      email,
      gender,
      address,
      emergency_contact_name,
      emergency_contact_phone
    )
    values (
      trim(p_first_name),
      trim(p_last_name),
      trim(p_phone_number),
      p_date_of_birth,
      nullif(trim(coalesce(p_email, '')), ''),
      p_gender,
      trim(p_address),
      nullif(trim(coalesce(p_emergency_contact_name, '')), ''),
      nullif(trim(coalesce(p_emergency_contact_phone, '')), '')
    )
    returning public.patients.patient_id into v_patient_id;

    v_patient_created := true;
  end if;

  if exists (
    select 1
    from public.appointments as a
    where a.doctor_id = p_doctor_id
      and a.appointment_date = p_appointment_date
      and a.appointment_time = p_appointment_time
      and a.appointment_status <> 'Cancelled'::public.appointment_status
  ) then
    raise exception 'That doctor already has an appointment at the selected date and time.' using errcode = '23505';
  end if;

  v_appointment_type := coalesce(p_appointment_type, 'Consultation'::public.appointment_type);

  insert into public.appointments (
    patient_id,
    doctor_id,
    branch_id,
    appointment_date,
    appointment_time,
    appointment_type,
    appointment_status,
    reason_for_visit,
    notes
  )
  values (
    v_patient_id,
    p_doctor_id,
    v_doctor_branch_id,
    p_appointment_date,
    p_appointment_time,
    v_appointment_type,
    v_appointment_status,
    nullif(trim(coalesce(p_reason_for_visit, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning public.appointments.appointment_id into v_appointment_id;

  appointment_id := v_appointment_id;
  patient_id := v_patient_id;
  doctor_id := p_doctor_id;
  branch_id := v_doctor_branch_id;
  appointment_date := p_appointment_date;
  appointment_time := p_appointment_time;
  appointment_type := v_appointment_type;
  appointment_status := v_appointment_status;
  patient_created := v_patient_created;

  return next;
end;
$function$;
