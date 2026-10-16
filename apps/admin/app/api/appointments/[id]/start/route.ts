import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

type EncounterResult = {
  encounter_id?: number | string;
  encounterId?: number | string;
  id?: number | string;
  appointment_id?: number | string;
  appointmentId?: number | string;
  encounter_status?: string;
  status?: string;
  created_now?: boolean;
};

function unwrapEncounter(value: unknown): EncounterResult | null {
  if (Array.isArray(value)) return unwrapEncounter(value[0]);
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const nestedKeys = ['result', 'data', 'encounter'];
  for (const key of nestedKeys) {
    if (record[key] !== undefined) {
      const nested = unwrapEncounter(record[key]);
      if (nested) return nested;
    }
  }

  return record as EncounterResult;
}

function numericId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

    const encounter = unwrapEncounter(data);
    const encounterId = numericId(encounter?.encounter_id ?? encounter?.encounterId ?? encounter?.id);
    const linkedAppointmentId = numericId(encounter?.appointment_id ?? encounter?.appointmentId ?? appointmentId);

    if (encounterId && linkedAppointmentId === appointmentId) {
      return NextResponse.json({
        encounter_id: encounterId,
        appointment_id: linkedAppointmentId,
        status: encounter?.encounter_status ?? encounter?.status ?? 'In Progress',
        created_now: encounter?.created_now,
      });
    }

    // The database function is atomic and may have completed even if PostgREST
    // returned an unexpected RPC envelope. Confirm the durable record before
    // reporting failure to the clinician, avoiding a false-negative retry.
    const { data: confirmedEncounter, error: confirmationError } = await supabase
      .from('encounters')
      .select('encounter_id, appointment_id, status')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    const confirmedEncounterId = numericId(confirmedEncounter?.encounter_id);
    const confirmedAppointmentId = numericId(confirmedEncounter?.appointment_id);

    if (!confirmationError && confirmedEncounterId && confirmedAppointmentId === appointmentId) {
      return NextResponse.json({
        encounter_id: confirmedEncounterId,
        appointment_id: confirmedAppointmentId,
        status: confirmedEncounter?.status ?? 'In Progress',
        created_now: false,
      });
    }

    console.error('Start encounter returned an unexpected result and no durable encounter could be confirmed:', {
      resultType: typeof data,
      isArray: Array.isArray(data),
      resultKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data as Record<string, unknown>) : [],
      encounterKeys: encounter ? Object.keys(encounter) : [],
      confirmationError: confirmationError?.message ?? null,
      appointmentId,
    });

    return NextResponse.json({
      error: 'The start operation could not confirm a clinical encounter. No appointment status change was assumed. Refresh the appointment and try once more if it is still checked in.',
    }, { status: 500 });
  } catch (error) {
    console.error('Start encounter API error:', error);
    return NextResponse.json({ error: 'Unexpected error while starting the clinical encounter.' }, { status: 500 });
  }
}
