import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: staff } = await supabase.from('careplus_staff_users')
    .select('id').eq('auth_user_id', claimsData.claims.sub).eq('active', true).eq('role', 'admin').maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const authUserId = typeof body?.auth_user_id === 'string' ? body.auth_user_id.trim() : '';
  const doctorId = Number(body?.doctor_id);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId) || !Number.isInteger(doctorId) || doctorId < 1) {
    return NextResponse.json({ error: 'Valid auth user ID and doctor ID are required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('link_careplus_doctor_staff', {
    p_auth_user_id: authUserId,
    p_doctor_id: doctorId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ staff: data });
}
