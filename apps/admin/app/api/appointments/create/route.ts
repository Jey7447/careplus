import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const APPOINTMENT_TYPES = [
  'Consultation',
  'Follow-up',
  'Emergency',
  'Lab Test',
  'Vaccination',
  'Surgery',
  'Physical Examination',
] as const;

const GENDERS = ['Male', 'Female', 'Other'] as const;

type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
type Gender = (typeof GENDERS)[number];

type RequestBody = {
  patient_id?: unknown;
  patient?: {
    first_name?: unknown;
    last_name?: unknown;
    phone_number?: unknown;
    date_of_birth?: unknown;
    gender?: unknown;
    email?: unknown;
    address?: unknown;
    emergency_contact_name?: unknown;
    emergency_contact_phone?: unknown;
  };
  doctor_id?: unknown;
  appointment_date?: unknown;
  appointment_time?: unknown;
  appointment_type?: unknown;
  reason_for_visit?: unknown;
  notes?: unknown;
};

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAppointmentType(value: unknown): value is AppointmentType {
  return typeof value === 'string' && APPOINTMENT_TYPES.includes(value as AppointmentType);
}

function isGender(value: unknown): value is Gender {
  return typeof value === 'string' && GENDERS.includes(value as Gender);
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Unable to create appointment.';
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: staffRecord, error: staffError } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (staffError) {
    console.error('Admin staff lookup failed:', staffError);
    return NextResponse.json({ error: 'Unable to verify administrator access.' }, { status: 500 });
  }

  if (!staffRecord) {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const doctorId = Number(body.doctor_id);
  const patientId = body.patient_id === undefined || body.patient_id === null || body.patient_id === ''
    ? null
    : Number(body.patient_id);
  const appointmentDate = body.appointment_date;
  const appointmentTime = body.appointment_time;
  const appointmentType = body.appointment_type ?? 'Consultation';
  const reasonForVisit = body.reason_for_visit;
  const notes = body.notes;

  if (!Number.isSafeInteger(doctorId) || doctorId < 1) {
    return NextResponse.json({ error: 'A valid doctor is required.' }, { status: 400 });
  }

  if (patientId !== null && (!Number.isSafeInteger(patientId) || patientId < 1)) {
    return NextResponse.json({ error: 'The selected patient is invalid.' }, { status: 400 });
  }

  if (!isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
    return NextResponse.json({ error: 'A valid appointment date and time are required.' }, { status: 400 });
  }

  if (!isAppointmentType(appointmentType)) {
    return NextResponse.json({ error: 'The selected appointment type is invalid.' }, { status: 400 });
  }

  if (reasonForVisit !== undefined && reasonForVisit !== null && typeof reasonForVisit !== 'string') {
    return NextResponse.json({ error: 'Reason for visit must be text.' }, { status: 400 });
  }

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return NextResponse.json({ error: 'Notes must be text.' }, { status: 400 });
  }

  const requestedDateTime = new Date(`${appointmentDate}T${appointmentTime}:00+01:00`);
  if (Number.isNaN(requestedDateTime.getTime()) || requestedDateTime.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'The appointment date and time must be in the future.' }, { status: 400 });
  }

  const patient = body.patient ?? {};

  if (patientId === null) {
    if (!isNonEmptyString(patient.first_name)
      || !isNonEmptyString(patient.last_name)
      || !isNonEmptyString(patient.phone_number)
      || !isValidDate(patient.date_of_birth)
      || !isGender(patient.gender)
      || !isNonEmptyString(patient.address)) {
      return NextResponse.json({
        error: 'First name, last name, phone number, date of birth, gender and address are required for a new patient.',
      }, { status: 400 });
    }

    const optionalPatientFields = [
      ['email', patient.email],
      ['emergency contact name', patient.emergency_contact_name],
      ['emergency contact phone', patient.emergency_contact_phone],
    ] as const;

    for (const [label, value] of optionalPatientFields) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return NextResponse.json({ error: `${label} must be text.` }, { status: 400 });
      }
    }
  }

  const { data, error } = await supabase.rpc('create_admin_appointment', {
    p_patient_id: patientId,
    p_first_name: patientId === null ? patient.first_name : null,
    p_last_name: patientId === null ? patient.last_name : null,
    p_phone_number: patientId === null ? patient.phone_number : null,
    p_date_of_birth: patientId === null ? patient.date_of_birth : null,
    p_gender: patientId === null ? patient.gender : null,
    p_email: patientId === null ? patient.email ?? null : null,
    p_address: patientId === null ? patient.address : null,
    p_emergency_contact_name: patientId === null ? patient.emergency_contact_name ?? null : null,
    p_emergency_contact_phone: patientId === null ? patient.emergency_contact_phone ?? null : null,
    p_doctor_id: doctorId,
    p_appointment_date: appointmentDate,
    p_appointment_time: appointmentTime,
    p_appointment_type: appointmentType,
    p_reason_for_visit: typeof reasonForVisit === 'string' ? reasonForVisit : null,
    p_notes: typeof notes === 'string' ? notes : null,
  });

  if (error) {
    console.error('Admin appointment creation failed:', error);

    const message = getErrorMessage(error);
    const conflict = error.code === '23505'
      || message.includes('already has an appointment')
      || message.includes('phone number already exists');

    const notFound = message.includes('not found');

    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : notFound ? 404 : error.code === '42501' ? 403 : 400 },
    );
  }

  const appointment = Array.isArray(data) ? data[0] : data;

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment could not be created.' }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    appointment,
    message: appointment.patient_created
      ? 'New patient and appointment created successfully.'
      : 'Appointment created successfully.',
  }, { status: 201 });
}
