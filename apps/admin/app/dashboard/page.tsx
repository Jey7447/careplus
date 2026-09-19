import Link from 'next/link';
import { ArrowRight, BarChart3, CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Settings, Stethoscope, Users } from 'lucide-react';
import { getDashboardStats } from '../../lib/dashboard';

const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
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

function statusClass(status: string) {
  return status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700';
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    ['Today’s Appointments', stats.todayAppointments, CalendarDays, 'appointments', 'View schedule'],
    ['Total Patients', stats.totalPatients, Users, 'patients', 'View patients'],
    ['Active Doctors', stats.activeDoctors, Stethoscope, 'doctors', 'View doctors'],
    ['Pending Notifications', stats.pendingNotifications, ClipboardList, 'notifications', 'View notifications'],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg"><HeartPulse size={22} /></div>
            <div><b className="text-sm text-slate-950">CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Dashboard' ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Dashboard' && <ArrowRight size={15} className="ml-auto" />}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8 lg:px-10 lg:py-10">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    CarePlus Medical Centre
                  </div>
                  <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Good morning, Admin.</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Your CarePlus operations at a glance. Monitor today’s activity and jump straight into the area that needs attention.</p>
                </div>
                <Link href="/appointments" className="group inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100">
                  Open appointments
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(([label, value, Icon, href, action]) => (
                <Link key={label} href={`/${href}`} className="group rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:scale-105 dark:bg-slate-800 dark:text-slate-200"><Icon size={20} /></div>
                    <ArrowRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200">{action} →</p>
                </Link>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operations</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Upcoming appointments</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Your next scheduled and confirmed appointments.</p>
                  </div>
                  <Link href="/appointments" className="hidden items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-950 sm:flex dark:text-slate-300 dark:hover:text-white">View all <ArrowRight size={15} /></Link>
                </div>

                <div className="mt-6 space-y-3">
                  {stats.upcomingAppointments.length > 0 ? stats.upcomingAppointments.map((appointment) => (
                    <Link key={appointment.appointment_id} href={`/appointments/${appointment.appointment_id}`} className="group flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50 sm:flex-row sm:items-center dark:border-slate-800 dark:hover:bg-slate-800">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><CalendarDays size={18} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-950 dark:text-white">Appointment #{appointment.appointment_id}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(appointment.appointment_status)}`}>{appointment.appointment_status}</span></div>
                        <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{appointment.patient_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{appointment.doctor_name}</p>
                      </div>
                      <div className="shrink-0 sm:text-right"><p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white">Open appointment <ArrowRight size={13} /></span></div>
                    </Link>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center dark:border-slate-800"><CalendarDays className="mx-auto text-slate-400" size={22} /><p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No upcoming appointments</p><p className="mt-1 text-xs text-slate-500">Scheduled and confirmed appointments will appear here.</p></div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">System status</p>
                <div className="mt-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><HeartPulse size={18} /></span><div><p className="font-semibold text-slate-900 dark:text-white">Database connected</p><p className="text-xs text-slate-500">Live Supabase data</p></div></div>
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Appointments today</span><span className="font-semibold text-slate-900 dark:text-white">{stats.todayAppointments}</span></div><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Active doctors</span><span className="font-semibold text-slate-900 dark:text-white">{stats.activeDoctors}</span></div><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Pending notifications</span><span className="font-semibold text-slate-900 dark:text-white">{stats.pendingNotifications}</span></div></div>
                <Link href="/feedback" className="group mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200"><BarChart3 size={17} /></span><div><p className="text-sm font-semibold text-slate-900 dark:text-white">Patient feedback</p><p className="text-xs text-slate-500">Review patient experience</p></div></div>
                  <ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
