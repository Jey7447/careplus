import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

const RESCHEDULABLE_STATUSES = ['Scheduled', 'Confirmed'] as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: staffRecord } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (!staffRecord) {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  }

  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) {
    return NextResponse.json({ error: 'Invalid appointment ID.' }, { status: 400 });
  }

  let body: { date?: unknown; time?: unknown; doctor_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const date = body.date;
  const time = body.time;
  const doctorId = Number(body.doctor_id);

  if (!isValidDate(date) || !isValidTime(time) || !Number.isSafeInteger(doctorId) || doctorId < 1) {
    return NextResponse.json({ error: 'A valid date, time and doctor are required.' }, { status: 400 });
  }

  const requestedDateTime = new Date(`${date}T${time}:00+01:00`);
  if (Number.isNaN(requestedDateTime.getTime())) {
    return NextResponse.json({ error: 'The requested date and time are invalid.' }, { status: 400 });
  }

  if (requestedDateTime.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'The new appointment time must be in the future.' }, { status: 400 });
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('appointment_id, appointment_status, doctor_id, branch_id, appointment_date, appointment_time')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (appointmentError) {
    console.error('Reschedule appointment lookup failed:', appointmentError);
    return NextResponse.json({ error: appointmentError.message }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
  }

  if (!RESCHEDULABLE_STATUSES.includes(appointment.appointment_status as (typeof RESCHEDULABLE_STATUSES)[number])) {
    return NextResponse.json({ error: `Appointments with status ${appointment.appointment_status} cannot be rescheduled.` }, { status: 409 });
  }

  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('doctor_id, first_name, last_name, active, branch_id')
    .eq('doctor_id', doctorId)
    .maybeSingle();

  if (doctorError) {
    console.error('Reschedule doctor lookup failed:', doctorError);
    return NextResponse.json({ error: doctorError.message }, { status: 500 });
  }

  if (!doctor) {
    return NextResponse.json({ error: 'Selected doctor was not found.' }, { status: 404 });
  }

  if (!doctor.active) {
    return NextResponse.json({ error: 'The selected doctor is inactive and cannot receive appointments.' }, { status: 409 });
  }

  const { data: conflicts, error: conflictError } = await supabase
    .from('appointments')
    .select('appointment_id, appointment_status')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .eq('appointment_time', time)
    .neq('appointment_id', appointmentId)
    .not('appointment_status', 'eq', 'Cancelled')
    .limit(1);

  if (conflictError) {
    console.error('Reschedule availability check failed:', conflictError);
    return NextResponse.json({ error: conflictError.message }, { status: 500 });
  }

  if ((conflicts ?? []).length > 0) {
    return NextResponse.json({ error: 'That doctor already has an appointment at the selected date and time.' }, { status: 409 });
  }

  const { data: updatedAppointment, error: updateError } = await supabase
    .from('appointments')
    .update({
      appointment_date: date,
      appointment_time: time,
      doctor_id: doctorId,
      branch_id: doctor.branch_id,
    })
    .eq('appointment_id', appointmentId)
    .select('appointment_id, appointment_date, appointment_time, appointment_status, doctor_id, branch_id')
    .maybeSingle();

  if (updateError) {
    console.error('Reschedule appointment update failed:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 409 });
  }

  if (!updatedAppointment) {
    return NextResponse.json({ error: 'Appointment could not be updated.' }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    appointment: updatedAppointment,
    message: 'Appointment rescheduled successfully.',
  });
}
