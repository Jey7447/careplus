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
    const encounterId = Number(id);
    if (!Number.isSafeInteger(encounterId) || encounterId < 1) {
      return NextResponse.json({ error: 'Invalid encounter ID.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('complete_careplus_encounter', { p_encounter_id: encounterId });
    if (error) {
      const message = error.message || 'Unable to complete the clinical encounter.';
      const status = /assigned to you|doctor access|required/i.test(message) ? 403
        : /not found/i.test(message) ? 404
        : /assessment and plan|in-progress encounters|not in progress/i.test(message) ? 409
        : 500;
      return NextResponse.json({ error: message }, { status });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) return NextResponse.json({ error: 'Encounter completion could not be confirmed.' }, { status: 500 });
    return NextResponse.json({ encounter_id: result.encounter_id, appointment_id: result.appointment_id, status: result.encounter_status, signed_at: result.signed_at });
  } catch (error) {
    console.error('Complete encounter API error:', error);
    return NextResponse.json({ error: 'Unexpected error while completing the clinical encounter.' }, { status: 500 });
  }
}
