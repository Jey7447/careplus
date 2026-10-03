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

  // Resolve the current CarePlus staff identity through the SECURITY DEFINER
  // helper so RLS on careplus_staff_users cannot make a valid account appear
  // unauthorized during middleware execution.
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

  // These are the routes exposed by the doctor workspace navigation.
  // Nested patient routes are included automatically.
  const isDoctorRoute =
    pathname === '/doctor-dashboard' ||
    pathname.startsWith('/doctor-dashboard/') ||
    pathname === '/patients' ||
    pathname.startsWith('/patients/') ||
    pathname === '/appointments' ||
    pathname.startsWith('/appointments/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/');

  // A signed-in user should never land on the login or unauthorized pages.
  // Send each valid role to its own workspace.
  if (isLoginPage || isUnauthorizedPage) {
    const url = request.nextUrl.clone();
    url.pathname = isCarePlusDoctor && !isCarePlusAdmin ? '/doctor-dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // The root route is the post-login landing point. Route by role before
  // allowing the app/page.tsx redirect to /dashboard.
  if (pathname === '/') {
    if (isCarePlusDoctor && !isCarePlusAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/doctor-dashboard';
      return NextResponse.redirect(url);
    }

    if (isCarePlusAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  // Doctors may use their clinical workspace. Admins retain access to it too.
  if (isDoctorRoute) {
    if (!isCarePlusDoctor && !isCarePlusAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    return response;
  }

  // All remaining authenticated application routes are administrator-only.
  if (!isCarePlusAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
