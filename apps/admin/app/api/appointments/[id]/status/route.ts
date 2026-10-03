import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

const ALLOWED_STATUSES = ['Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'] as const;
type AppointmentStatus = (typeof ALLOWED_STATUSES)[number];
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (claimsError) return NextResponse.json({ error: 'Unable to verify the current session.' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { data: staffRecord, error: staffError } = await supabase.rpc('current_careplus_staff');
    if (staffError) return NextResponse.json({ error: 'Unable to verify CarePlus access.' }, { status: 500 });

    const isAdmin = staffRecord?.active === true && staffRecord?.role === 'admin';
    const isDoctor = staffRecord?.active === true && staffRecord?.role === 'doctor' && Boolean(staffRecord?.doctor_id);
    if (!isAdmin && !isDoctor) return NextResponse.json({ error: 'CarePlus staff access required.' }, { status: 403 });

    const { id } = await params;
    const appointmentId = Number(id);
    if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) return NextResponse.json({ error: 'Invalid appointment ID.' }, { status: 400 });

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
    const requestedStatus = typeof body === 'object' && body !== null && 'status' in body ? (body as { status?: unknown }).status : undefined;
    if (!ALLOWED_STATUSES.includes(requestedStatus as AppointmentStatus)) return NextResponse.json({ error: 'Invalid appointment status.' }, { status: 400 });

    if (isDoctor) {
      const { data: currentAppointment, error: currentError } = await supabase.from('appointments').select('appointment_id, appointment_status').eq('appointment_id', appointmentId).eq('doctor_id', staffRecord.doctor_id).maybeSingle();
      if (currentError) return NextResponse.json({ error: 'Unable to verify the assigned appointment.' }, { status: 500 });
      if (!currentAppointment) return NextResponse.json({ error: 'Appointment not found or not assigned to you.' }, { status: 404 });
      const allowed = (currentAppointment.appointment_status === 'Checked In' && requestedStatus === 'In Progress') || (currentAppointment.appointment_status === 'In Progress' && requestedStatus === 'Completed');
      if (!allowed) return NextResponse.json({ error: 'Doctors may only start checked-in appointments or complete appointments already in progress.' }, { status: 403 });
    }

    const updateQuery = supabase.from('appointments').update({ appointment_status: requestedStatus as AppointmentStatus }).eq('appointment_id', appointmentId);
    const { data, error } = await (isDoctor && staffRecord.doctor_id ? updateQuery.eq('doctor_id', staffRecord.doctor_id).select('appointment_id, appointment_status').maybeSingle() : updateQuery.select('appointment_id, appointment_status').maybeSingle());
    if (error) {
      console.error('Appointment status update error:', error);
      return NextResponse.json({ error: error.message || 'The database rejected the appointment status update.' }, { status: 409 });
    }
    if (!data) return NextResponse.json({ error: 'Appointment was not found or could not be updated.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected appointment status API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected server error while updating appointment status.' }, { status: 500 });
  }
}
