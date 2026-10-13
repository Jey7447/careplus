import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claimsData?.claims?.sub) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const appointmentId = Number(id);
    if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) {
      return NextResponse.json({ error: 'Invalid appointment ID.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('start_careplus_encounter', {
      p_appointment_id: appointmentId,
    });

    if (error) {
      const message = error.message || 'Unable to start the clinical encounter.';
      const status = /assigned to you|doctor access|required/i.test(message) ? 403
        : /not found/i.test(message) ? 404
        : /only checked-in|cancelled encounter/i.test(message) ? 409
        : 500;
      return NextResponse.json({ error: message }, { status });
    }

    const encounter = Array.isArray(data) ? data[0] : data;
    // PostgreSQL bigint values can be serialized by PostgREST as strings.
    // Normalize IDs at the API boundary before returning JSON to the client.
    const encounterId = Number(encounter?.encounter_id);
    const linkedAppointmentId = Number(encounter?.appointment_id);
    if (!encounter || !Number.isSafeInteger(encounterId) || encounterId < 1 || !Number.isSafeInteger(linkedAppointmentId) || linkedAppointmentId !== appointmentId) {
      return NextResponse.json({ error: 'The encounter could not be confirmed after starting.' }, { status: 500 });
    }

    return NextResponse.json({
      encounter_id: encounterId,
      appointment_id: linkedAppointmentId,
      status: encounter.encounter_status,
      created_now: encounter.created_now,
    });
  } catch (error) {
    console.error('Start encounter API error:', error);
    return NextResponse.json({ error: 'Unexpected error while starting the clinical encounter.' }, { status: 500 });
  }
}
