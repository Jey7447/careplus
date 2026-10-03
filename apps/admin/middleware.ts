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

  // Resolve the current CarePlus staff identity through a SECURITY DEFINER
  // database helper. This avoids relying on direct reads of the staff table
  // from middleware, where RLS can otherwise make an otherwise valid doctor
  // account appear unauthorized.
  const { data: staffRecord, error: staffError } = await supabase.rpc('current_careplus_staff');

  const isCarePlusAdmin =
    !staffError &&
    staffRecord?.active === true &&
    staffRecord?.role === 'admin';

  const isCarePlusDoctor =
    !staffError &&
    staffRecord?.active === true &&
    staffRecord?.role === 'doctor' &&
    Boolean(staffRecord?.doctor_id);

  const isDoctorRoute =
    pathname === '/doctor-dashboard' ||
    pathname.startsWith('/doctor-dashboard/');

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
