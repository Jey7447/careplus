import { ArrowLeft, CalendarDays, HeartPulse, Settings, Stethoscope, Users, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import RescheduleForm from '../../reschedule-form';
import { createClient } from '../../../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', HeartPulse],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Settings', '/settings', Settings],
] as const;

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export default async function RescheduleAppointmentPage({ params }: PageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (!staffRecord) redirect('/unauthorized');

  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) notFound();

  const [{ data: appointment }, { data: doctors }] = await Promise.all([
    supabase
      .from('appointments')
      .select('appointment_id, appointment_date, appointment_time, appointment_status, doctor_id')
      .eq('appointment_id', appointmentId)
      .maybeSingle(),
    supabase
      .from('doctors')
      .select('doctor_id, first_name, last_name, specialty, branch_id')
      .eq('active', true)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
  ]);

  if (!appointment) notFound();

  if (!['Scheduled', 'Confirmed'].includes(appointment.appointment_status)) {
    return (
      <main className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
            <div className="flex items-center gap-3 p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div><div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div></div>
            <nav className="flex-1 px-3">{navigation.map(([label, href, Icon]) => <Link key={label} href={href} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600"><Icon size={18} />{label}</Link>)}</nav>
          </aside>
          <section className="flex-1">
            <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8"><div className="mx-auto max-w-7xl"><Link href={`/appointments/${appointmentId}`} className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} /> Back to appointment</Link><p className="mt-4 text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="mt-1 text-2xl font-semibold">Reschedule appointment #{appointmentId}</h1></div></header>
            <div className="mx-auto max-w-3xl p-6 lg:p-8"><section className="rounded-2xl border border-[var(--border)] bg-white p-6"><h2 className="font-semibold">Rescheduling is unavailable</h2><p className="mt-2 text-sm text-slate-500">Appointments with status {appointment.appointment_status} cannot be rescheduled.</p></section></div>
          </section>
        </div>
      </main>
    );
  }

  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div><div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div></div>
          <nav className="flex-1 px-3">{navigation.map(([label, href, Icon]) => <Link key={label} href={href} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600"><Icon size={18} />{label}</Link>)}</nav>
          <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>
        <section className="flex-1">
          <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
              <div>
                <Link href={`/appointments/${appointmentId}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 outline-none focus:outline-none focus-visible:outline-none"><ArrowLeft size={16} /> Back to appointment</Link>
                <p className="mt-4 text-sm text-slate-500">CarePlus Medical Centre</p>
                <h1 className="mt-1 text-2xl font-semibold">Reschedule appointment #{appointmentId}</h1>
                <p className="mt-1 text-sm text-slate-500">Choose a new date, time and doctor. Availability will be checked before saving.</p>
              </div>
              <div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-800">{email}</p></div>
            </div>
          </header>
          <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><CalendarDays size={19} /></div><div><h2 className="font-semibold">Reschedule appointment</h2><p className="text-sm text-slate-500">Current appointment: {appointment.appointment_date} at {String(appointment.appointment_time).slice(0, 5)}</p></div></div>
            </section>
            <RescheduleForm appointmentId={appointment.appointment_id} currentDate={appointment.appointment_date} currentTime={String(appointment.appointment_time)} currentDoctorId={appointment.doctor_id} doctors={doctors ?? []} currentStatus={appointment.appointment_status} />
          </div>
        </section>
      </div>
    </main>
  );
}
