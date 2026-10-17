import Link from 'next/link';
import { AlertCircle, ArrowRight, BarChart3, Bell, CalendarDays, CheckCircle2, ClipboardList, HeartPulse, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { getDashboardStats } from '../../lib/dashboard';

const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', Bell],
  ['Feedback', '/feedback', MessageSquare],
  ['Reports', '/reports', BarChart3],
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
  const feedbackAttentionCount = stats.feedbackAttentionCount;
  const totalFeedback = stats.feedbackNormal + stats.feedbackFollowUp + stats.feedbackCritical;

  return (
    <main className="min-h-screen bg-[#f4f7f7] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><HeartPulse size={22} /></div>
              <div><b className="text-sm text-slate-950">CarePlus</b><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operations workspace</p></div>
            </div>
            <div className="mt-6 rounded-[22px] bg-slate-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Control room</p>
              <p className="mt-2 text-sm font-semibold">Your clinic at a glance</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">People, appointments and patient experience in one operational view.</p>
            </div>
          </div>
          <nav className="flex-1 px-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Dashboard' ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Dashboard' && <ArrowRight size={15} className="ml-auto text-teal-500" />}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500"><ShieldCheck size={17} className="text-teal-600" /><span>CarePlus Administration</span></div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="relative overflow-hidden rounded-[30px] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8 lg:px-10 lg:py-9">
              <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />
              <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200 backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" />CarePlus operations</div>
                  <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[42px]">Good morning, Admin.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">The clinic is moving. Here is the operational picture, what needs attention, and where the day is heading.</p>
                </div>
                <Link href="/appointments" className="group inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100">Open appointments <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-[26px] bg-teal-700 p-6 text-white shadow-lg shadow-teal-700/15 sm:p-7">
                <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100">Today's pulse</p><CalendarDays size={20} className="text-teal-100" /></div>
                  <p className="mt-7 text-5xl font-semibold tracking-tight">{stats.todayAppointments}</p>
                  <p className="mt-2 text-sm font-medium text-teal-50">appointments scheduled today</p>
                  <div className="mt-7 flex items-center gap-2 text-xs text-teal-100"><span className="h-2 w-2 rounded-full bg-white" />Live operational count</div>
                </div>
              </div>
              <Link href="/patients" className="group rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
                <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Users size={20} /></span><ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" /></div>
                <p className="mt-7 text-3xl font-semibold tracking-tight">{stats.totalPatients}</p><p className="mt-1 text-sm font-semibold text-slate-800">Patients</p><p className="mt-2 text-xs leading-5 text-slate-500">Registered across the CarePlus system.</p>
              </Link>
              <Link href="/doctors" className="group rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
                <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Stethoscope size={20} /></span><ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" /></div>
                <p className="mt-7 text-3xl font-semibold tracking-tight">{stats.activeDoctors}</p><p className="mt-1 text-sm font-semibold text-slate-800">Active doctors</p><p className="mt-2 text-xs leading-5 text-slate-500">Clinicians currently available in the system.</p>
              </Link>
            </section>

            {feedbackAttentionCount > 0 && (
              <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-[#fffaf0] shadow-sm">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"><AlertCircle size={21} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Needs attention</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{feedbackAttentionCount} patient feedback item{feedbackAttentionCount === 1 ? '' : 's'} need review</h2><p className="mt-1 text-sm text-slate-500">AI-triaged feedback that has been marked for staff attention.</p></div></div>
                  <Link href="/feedback" className="group inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Review feedback <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></Link>
                </div>
                <div className="grid border-t border-amber-100 sm:grid-cols-3">
                  <Link href="/feedback?status=normal" className="flex items-center justify-between border-b border-amber-100 px-5 py-4 hover:bg-amber-50 sm:border-b-0 sm:border-r"><span className="text-sm font-medium text-emerald-800">Normal</span><span className="text-lg font-semibold text-emerald-900">{stats.feedbackNormal}</span></Link>
                  <Link href="/feedback?status=follow_up" className="flex items-center justify-between border-b border-amber-100 px-5 py-4 hover:bg-amber-50 sm:border-b-0 sm:border-r"><span className="text-sm font-medium text-amber-800">Follow-up required</span><span className="text-lg font-semibold text-amber-900">{stats.feedbackFollowUp}</span></Link>
                  <Link href="/feedback?status=critical" className="flex items-center justify-between px-5 py-4 hover:bg-amber-50"><span className="text-sm font-medium text-red-800">Critical</span><span className="text-lg font-semibold text-red-900">{stats.feedbackCritical}</span></Link>
                </div>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">Care delivery</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">The day ahead</h2><p className="mt-2 text-sm text-slate-500">The next appointments moving through the clinic.</p></div><Link href="/appointments" className="hidden items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950 sm:flex">View all <ArrowRight size={15} /></Link></div>
                <div className="mt-6 space-y-3">
                  {stats.upcomingAppointments.length > 0 ? stats.upcomingAppointments.map((appointment) => (
                    <Link key={appointment.appointment_id} href={`/appointments/${appointment.appointment_id}`} className="group flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-teal-200 hover:bg-teal-50/30 sm:flex-row sm:items-center">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white"><CalendarDays size={18} /></div>
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Appointment #{appointment.appointment_id}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(appointment.appointment_status)}`}>{appointment.appointment_status}</span></div><p className="mt-1 text-sm font-medium text-slate-800">{appointment.patient_name}</p><p className="mt-0.5 text-xs text-slate-500">{appointment.doctor_name}</p></div>
                      <div className="shrink-0 sm:text-right"><p className="text-sm font-semibold">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:text-teal-800">Open <ArrowRight size={13} /></span></div>
                    </Link>
                  )) : <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center"><CalendarDays className="mx-auto text-slate-300" size={23} /><p className="mt-3 text-sm font-semibold text-slate-700">No upcoming appointments</p><p className="mt-1 text-xs text-slate-500">Scheduled and confirmed appointments will appear here.</p></div>}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[26px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-7">
                  <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300">Operational health</p><CheckCircle2 size={19} className="text-teal-300" /></div>
                  <p className="mt-5 text-lg font-semibold">CarePlus is connected</p><p className="mt-1 text-sm text-slate-400">Live Supabase data is available.</p>
                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5"><div className="flex justify-between text-sm"><span className="text-slate-400">Pending notifications</span><span className="font-semibold">{stats.pendingNotifications}</span></div><div className="flex justify-between text-sm"><span className="text-slate-400">Feedback recorded</span><span className="font-semibold">{totalFeedback}</span></div></div>
                </div>
                <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">Quick routes</p><div className="mt-4 space-y-2"><Link href="/notifications" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium transition hover:bg-teal-50"><span className="flex items-center gap-3"><Bell size={17} className="text-slate-500" />Notifications</span><ArrowRight size={15} className="text-slate-300 group-hover:text-teal-700" /></Link><Link href="/feedback" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium transition hover:bg-teal-50"><span className="flex items-center gap-3"><MessageSquare size={17} className="text-slate-500" />Patient feedback</span><ArrowRight size={15} className="text-slate-300 group-hover:text-teal-700" /></Link><Link href="/reports" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium transition hover:bg-teal-50"><span className="flex items-center gap-3"><BarChart3 size={17} className="text-slate-500" />Reports</span><ArrowRight size={15} className="text-slate-300 group-hover:text-teal-700" /></Link></div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <Link href="/appointments" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Appointments</span><CalendarDays size={18} className="text-teal-600" /></div><p className="mt-3 text-sm font-semibold">Manage the clinic schedule</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">Open workspace <ArrowRight size={13} /></span></Link>
              <Link href="/patients" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Patients</span><Users size={18} className="text-teal-600" /></div><p className="mt-3 text-sm font-semibold">Find and manage patient records</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">Open workspace <ArrowRight size={13} /></span></Link>
              <Link href="/doctors" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Doctors</span><Stethoscope size={18} className="text-teal-600" /></div><p className="mt-3 text-sm font-semibold">See the clinical team</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">Open workspace <ArrowRight size={13} /></span></Link>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
