import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const MAX_FIELD_LENGTH = 10000;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: staff, error: staffError } = await supabase.rpc('current_careplus_staff');
    if (staffError) return NextResponse.json({ error: 'Unable to verify CarePlus access.' }, { status: 500 });
    if (staff?.active !== true || staff?.role !== 'doctor' || !staff?.doctor_id) {
      return NextResponse.json({ error: 'Active doctor access required.' }, { status: 403 });
    }

    const { id } = await params;
    const encounterId = Number(id);
    if (!Number.isSafeInteger(encounterId) || encounterId < 1) {
      return NextResponse.json({ error: 'Invalid encounter ID.' }, { status: 400 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid clinical note.' }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const fields = ['chief_complaint', 'clinical_summary', 'assessment', 'plan'] as const;
    const update: Record<string, string | null> = {};
    for (const field of fields) {
      if (!(field in input)) continue;
      const value = input[field];
      if (value !== null && typeof value !== 'string') {
        return NextResponse.json({ error: `Invalid value for ${field}.` }, { status: 400 });
      }
      if (typeof value === 'string' && value.length > MAX_FIELD_LENGTH) {
        return NextResponse.json({ error: `${field} exceeds the 10,000 character limit.` }, { status: 400 });
      }
      update[field] = typeof value === 'string' && value.trim() ? value.trim() : null;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No editable clinical note fields were supplied.' }, { status: 400 });
    }

    const { data: encounter, error: readError } = await supabase
      .from('encounters')
      .select('encounter_id, status')
      .eq('encounter_id', encounterId)
      .eq('doctor_id', staff.doctor_id)
      .maybeSingle();
    if (readError) return NextResponse.json({ error: 'Unable to load the clinical encounter.' }, { status: 500 });
    if (!encounter) return NextResponse.json({ error: 'Encounter not found or not assigned to you.' }, { status: 404 });
    if (!['Draft', 'In Progress'].includes(encounter.status)) {
      return NextResponse.json({ error: 'Only draft or in-progress encounters can be edited.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('encounters')
      .update(update)
      .eq('encounter_id', encounterId)
      .eq('doctor_id', staff.doctor_id)
      .in('status', ['Draft', 'In Progress'])
      .select('encounter_id, status, chief_complaint, clinical_summary, assessment, plan, updated_at')
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'The clinical note could not be saved.' }, { status: 409 });
    if (!data) return NextResponse.json({ error: 'Encounter changed while saving. Refresh and try again.' }, { status: 409 });

    return NextResponse.json({ encounter: data });
  } catch (error) {
    console.error('Encounter note save error:', error);
    return NextResponse.json({ error: 'Unexpected error while saving the clinical note.' }, { status: 500 });
  }
}
