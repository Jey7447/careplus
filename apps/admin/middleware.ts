import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';
  const isUnauthorizedPage = pathname === '/unauthorized';

  if (!claims) {
    if (!isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    return response;
  }

  const [{ data: adminRecord, error: adminError }, { data: doctorRecord, error: doctorError }] = await Promise.all([
    supabase
      .from('careplus_staff_users')
      .select('id')
      .eq('auth_user_id', claims.sub)
      .eq('active', true)
      .eq('role', 'admin')
      .maybeSingle(),
    supabase
      .from('careplus_staff_users')
      .select('id, doctor_id')
      .eq('auth_user_id', claims.sub)
      .eq('active', true)
      .eq('role', 'doctor')
      .maybeSingle(),
  ]);

  const isCarePlusAdmin = !adminError && Boolean(adminRecord);
  const isCarePlusDoctor = !doctorError && Boolean(doctorRecord?.doctor_id);

  const isDoctorRoute = pathname === '/doctor-dashboard' || pathname.startsWith('/doctor-dashboard/');

  if (isDoctorRoute) {
    if (!isCarePlusDoctor && !isCarePlusAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (!isCarePlusAdmin) {
    if (!isUnauthorizedPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (isLoginPage || isUnauthorizedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
