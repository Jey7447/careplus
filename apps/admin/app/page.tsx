import { CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Settings, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '#', Users],
  ['Doctors', '#', Stethoscope],
  ['Notifications', '#', ClipboardList],
  ['Settings', '#', Settings],
] as const;

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(`${date}T12:00:00+01:00`));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (staffError || !staffRecord) redirect('/unauthorized');

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

  const [appointmentsCount, patientsCount, doctorsCount, notificationsCount, upcomingResult] = await Promise.all([
    supabase.from('appointments').select('appointment_id', { count: 'exact', head: true }).eq('appointment_date', today),
    supabase.from('patients').select('patient_id', { count: 'exact', head: true }),
    supabase.from('doctors').select('doctor_id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('appointments').select('appointment_id, appointment_date, appointment_time, appointment_status, patient_id, doctor_id').gte('appointment_date', today).in('appointment_status', ['Scheduled', 'Confirmed']).order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true }).limit(6),
  ]);

  const dataErrors = [appointmentsCount.error, patientsCount.error, doctorsCount.error, notificationsCount.error, upcomingResult.error].filter(Boolean);
  const upcoming = upcomingResult.data ?? [];
  const patientIds = [...new Set(upcoming.map((appointment) => appointment.patient_id))];
  const doctorIds = [...new Set(upcoming.map((appointment) => appointment.doctor_id))];

  const [{ data: patients }, { data: doctors }] = await Promise.all([
    patientIds.length ? supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', patientIds) : Promise.resolve({ data: [], error: null }),
    doctorIds.length ? supabase.from('doctors').select('doctor_id, first_name, last_name').in('doctor_id', doctorIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const patientMap = new Map((patients ?? []).map((patient) => [patient.patient_id, `${patient.first_name} ${patient.last_name}`]));
  const doctorMap = new Map((doctors ?? []).map((doctor) => [doctor.doctor_id, `Dr. ${doctor.first_name} ${doctor.last_name}`]));
  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';
  const stats = [["Today's Appointments", appointmentsCount.count ?? 0, CalendarDays], ['Total Patients', patientsCount.count ?? 0, Users], ['Active Doctors', doctorsCount.count ?? 0, Stethoscope], ['Pending Notifications', notificationsCount.count ?? 0, ClipboardList]] as const;

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div><div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div></div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => href === '#' ? (
              <div key={label} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400"><Icon size={18} />{label}</div>
            ) : (
              <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${label === 'Dashboard' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}><Icon size={18} />{label}</Link>
            ))}
          </nav>
          <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-6"><div><p className="text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="mt-1 text-2xl font-semibold">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Overview of centre activity.</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-800">{email}</p></div></div></header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">Authentication, administrator authorization, and protected database access are active.</div>
            {dataErrors.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">Some dashboard data could not be loaded. The protected connection is active, but one or more database queries returned an error.</div>}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-5"><div className="flex justify-between text-sm text-slate-500"><span>{label}</span><Icon size={19} /></div><p className="mt-4 text-3xl font-semibold">{value}</p></div>)}</div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">Upcoming appointments</h2><p className="mt-1 text-sm text-slate-500">Scheduled and confirmed appointments from CarePlus.</p></div><Link href="/appointments" className="text-sm font-medium text-slate-700 hover:text-slate-900">View all</Link></div><div className="mt-6 overflow-hidden rounded-xl border border-slate-200">{upcoming.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No upcoming appointments found.</div> : <div className="divide-y divide-slate-100">{upcoming.map((appointment) => <div key={appointment.appointment_id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-900">{patientMap.get(appointment.patient_id) ?? 'Patient'}</p><p className="mt-1 text-xs text-slate-500">{doctorMap.get(appointment.doctor_id) ?? 'Doctor'}</p></div><div className="text-left sm:text-right"><p className="text-sm font-medium text-slate-800">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)} · {appointment.appointment_status}</p></div></div>)}</div>}</div></section>
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><h2 className="font-semibold">System status</h2><div className="mt-5 space-y-4 text-sm">{[['Supabase database', 'Connected'], ['Appointment automation', 'Active'], ['Notification tracking', 'Active']].map(([item, status]) => <div key={item} className="flex justify-between gap-4"><span className="text-slate-600">{item}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{status}</span></div>)}</div></section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
