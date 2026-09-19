import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardList, HeartPulse, Stethoscope, Users } from 'lucide-react';
import { getDashboardStats } from '../../lib/dashboard';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    ['Today’s Appointments', stats.todayAppointments, CalendarDays, 'appointments', 'View schedule'],
    ['Total Patients', stats.totalPatients, Users, 'patients', 'View patients'],
    ['Active Doctors', stats.activeDoctors, Stethoscope, 'doctors', 'View doctors'],
    ['Pending Notifications', stats.pendingNotifications, ClipboardList, 'notifications', 'View notifications'],
  ] as const;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
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
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:scale-105 dark:bg-slate-800 dark:text-slate-200">
                  <Icon size={20} />
                </div>
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
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">CarePlus command centre</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">The dashboard is connected to live Supabase data. Use the modules below to manage day-to-day clinical operations.</p>
              </div>
              <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white sm:grid dark:bg-white dark:text-slate-950"><HeartPulse size={20} /></div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['Appointments', 'Manage today’s schedule and appointment status.', '/appointments', CalendarDays],
                ['Patients', 'Open patient records and contact information.', '/patients', Users],
                ['Doctors', 'Review active providers and assignments.', '/doctors', Stethoscope],
                ['Notifications', 'Track pending and delivered communications.', '/notifications', ClipboardList],
              ].map(([title, description, href, Icon]) => (
                <Link key={title as string} href={href as string} className="group rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon size={17} /></div>
                    <span className="font-medium text-slate-900 dark:text-white">{title as string}</span>
                    <ArrowRight size={15} className="ml-auto text-slate-400 transition group-hover:translate-x-1" />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{description as string}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">System status</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><HeartPulse size={18} /></span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Database connected</p>
                <p className="text-xs text-slate-500">Live Supabase data</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Appointments today</span><span className="font-semibold text-slate-900 dark:text-white">{stats.todayAppointments}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Active doctors</span><span className="font-semibold text-slate-900 dark:text-white">{stats.activeDoctors}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Pending notifications</span><span className="font-semibold text-slate-900 dark:text-white">{stats.pendingNotifications}</span></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
