import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(request: Request) {
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

  const search = new URL(request.url).searchParams.get('search')?.trim() ?? '';

  if (search.length < 2) {
    return NextResponse.json({ patients: [] });
  }

  const escaped = search.replace(/[%_,]/g, (character) => `\\${character}`);
  const pattern = `%${escaped}%`;

  const { data: patients, error } = await supabase
    .from('patients')
    .select('patient_id, first_name, last_name, phone_number, date_of_birth, gender, email, address')
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone_number.ilike.${pattern},email.ilike.${pattern}`)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Patient search failed:', error);
    return NextResponse.json({ error: 'Unable to search patients.' }, { status: 500 });
  }

  return NextResponse.json({ patients: patients ?? [] });
}
