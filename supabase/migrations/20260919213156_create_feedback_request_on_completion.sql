create or replace function public.create_feedback_request_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_token uuid;
  v_patient_name text;
  v_patient_phone text;
  v_existing_request_id bigint;
begin
  if old.appointment_status <> 'In Progress'::appointment_status
     or new.appointment_status <> 'Completed'::appointment_status then
    return new;
  end if;

  select fr.request_id
    into v_existing_request_id
  from public.feedback_requests fr
  where fr.appointment_id = new.appointment_id
  order by fr.created_at desc
  limit 1;

  if v_existing_request_id is not null then
    return new;
  end if;

  insert into public.feedback_requests (
    appointment_id,
    patient_id,
    doctor_id,
    branch_id,
    expires_at
  )
  values (
    new.appointment_id,
    new.patient_id,
    new.doctor_id,
    new.branch_id,
    now() + interval '30 days'
  )
  returning token into v_token;

  select concat(p.first_name, ' ', p.last_name), p.phone_number
    into v_patient_name, v_patient_phone
  from public.patients p
  where p.patient_id = new.patient_id;

  if nullif(trim(coalesce(v_patient_phone, '')), '') is not null then
    insert into public.notifications (
      appointment_id,
      recipient,
      recipient_contact,
      channel,
      message,
      status,
      notification_type
    )
    values (
      new.appointment_id,
      v_patient_name,
      v_patient_phone,
      'SMS',
      'Thank you for visiting CarePlus Medical Centre. Please share your feedback: /patient-feedback/' || v_token::text,
      'Pending',
      'patient_feedback_request'
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_create_feedback_request_on_completion on public.appointments;

create trigger trg_create_feedback_request_on_completion
after update of appointment_status on public.appointments
for each row
execute function public.create_feedback_request_on_completion();
