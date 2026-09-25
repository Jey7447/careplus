'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  HeartPulse,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReportStats } from '../../lib/reports';

const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Feedback', '/feedback', BarChart3],
  ['Reports', '/reports', BarChart3],
  ['Settings', '/settings', Settings],
] as const;

const views = [
  ['Overview', 'overview'],
  ['Appointments', 'appointments'],
  ['Notifications', 'notifications'],
  ['Feedback', 'feedback'],
] as const;

type View = (typeof views)[number][1];

type SummaryCard = [label: string, value: number, Icon: LucideIcon, target: View];

function statusClass(status: string) {
  if (status === 'Completed' || status === 'Delivered') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Cancelled' || status === 'Failed') return 'bg-red-50 text-red-700';
  if (status === 'Confirmed') return 'bg-blue-50 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 700;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

function scrollTo(id: string, setView: (view: View) => void) {
  setView(id as View);
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function ReportsDashboard({ stats }: { stats: ReportStats }) {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFailure, setExpandedFailure] = useState<number | null>(null);

  const deliveryRate = stats.notifications.total
    ? Math.round((stats.notifications.delivered / stats.notifications.total) * 100)
    : 0;
  const appointmentMax = Math.max(...stats.appointments.byStatus.map((item) => item.count), 1);
  const notificationMax = Math.max(...stats.notifications.byChannel.map((item) => item.count), 1);
  const healthLabel = stats.notifications.staleLocks > 0 ? 'Attention required' : stats.notifications.locked > 0 ? 'Processing' : 'All systems clear';
  const healthTone = stats.notifications.staleLocks > 0 ? 'text-red-600' : stats.notifications.locked > 0 ? 'text-amber-600' : 'text-emerald-600';

  const channelIcons = useMemo<Record<string, LucideIcon>>(() => ({
    SMS: Smartphone,
    Email: Mail,
    WhatsApp: Smartphone,
  }), []);

  const summaryCards: SummaryCard[] = [
    ['Appointments', stats.appointments.total, CalendarDays, 'appointments'],
    ['Notifications', stats.notifications.total, Bell, 'notifications'],
    ['Failed notifications', stats.notifications.failed, XCircle, 'notifications'],
    ['Feedback records', stats.feedback.total, BarChart3, 'feedback'],
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 900);
  };

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
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 ${label === 'Reports' ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Reports' && <ArrowRight size={15} className="ml-auto" />}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white lg:px-10">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />
            <div className="absolute right-1/3 top-10 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl" />
            <div className="relative mx-auto max-w-7xl">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">CarePlus Medical Centre</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reports & Analytics</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A live operational view of appointments, communications, feedback and notification queue health.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <span className={`relative flex h-2 w-2 ${stats.notifications.staleLocks ? '' : 'animate-pulse'}`}><span className={`absolute inline-flex h-full w-full rounded-full opacity-70 ${stats.notifications.staleLocks ? 'bg-red-400' : 'bg-emerald-400'}`} /><span className={`relative inline-flex h-2 w-2 rounded-full ${stats.notifications.staleLocks ? 'bg-red-400' : 'bg-emerald-400'}`} /></span>
                    {healthLabel}
                  </div>
                  <button onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 active:scale-95" type="button">
                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
              </div>

              <div className="mt-7 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
                {views.map(([label, id]) => (
                  <button key={id} onClick={() => scrollTo(id, setView)} type="button" className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition-all duration-200 ${view === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
            <section id="overview" className="scroll-mt-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(([label, value, Icon, target]) => (
                  <button key={label} onClick={() => scrollTo(target, setView)} type="button" className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-50 transition-transform duration-500 group-hover:scale-150" />
                    <div className="relative flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"><Icon size={17} /></span></div>
                    <p className="relative mt-5 text-3xl font-semibold tracking-tight text-slate-950"><AnimatedNumber value={Number(value)} /></p>
                    <p className="relative mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-400 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">Explore <ArrowRight size={12} /></p>
                    <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-slate-950 transition-all duration-300 group-hover:w-full" />
                  </button>
                ))}
              </div>
            </section>

            <section id="appointments" className="scroll-mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Appointments</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Appointment status</h2><p className="mt-1 text-sm text-slate-500">{stats.appointments.today} appointment{stats.appointments.today === 1 ? '' : 's'} scheduled for today.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><CalendarDays size={18} className="text-slate-600" /></span></div>
                <div className="mt-6 space-y-4">
                  {stats.appointments.byStatus.map((item, index) => (
                    <div key={item.status} className="group animate-[fadeIn_.5s_ease-out_both]" style={{ animationDelay: `${index * 45}ms` }}>
                      <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-sm text-slate-600">{item.status}</span><span className={`min-w-10 rounded-full px-2 py-1 text-center text-xs font-semibold ${statusClass(item.status)}`}>{item.count}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full origin-left rounded-full bg-slate-700 transition-all duration-700 ease-out group-hover:bg-slate-950" style={{ width: `${Math.max(4, Math.round((item.count / appointmentMax) * 100))}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Appointment activity</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Operational snapshot</h2><p className="mt-1 text-sm text-slate-500">A quick read on today's workload and current appointment volume.</p></div><Activity size={20} className="text-slate-500" /></div>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs text-slate-400">Total appointments</p><p className="mt-2 text-3xl font-semibold"><AnimatedNumber value={stats.appointments.total} /></p></div>
                  <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs text-slate-500">Scheduled today</p><p className="mt-2 text-3xl font-semibold text-slate-950"><AnimatedNumber value={stats.appointments.today} /></p></div>
                </div>
                <Link href="/appointments" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:gap-3 hover:text-slate-950">Open appointments <ArrowRight size={15} /></Link>
              </div>
            </section>

            <section id="notifications" className="scroll-mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Notifications</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Delivery pipeline</h2><p className="mt-1 text-sm text-slate-500">Current notification state across all channels.</p></div><div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"><Zap size={13} /> {deliveryRate}% delivered</div></div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[['Pending', stats.notifications.pending, Clock3], ['Sent', stats.notifications.sent, Activity], ['Delivered', stats.notifications.delivered, CheckCircle2], ['Failed', stats.notifications.failed, XCircle]].map(([label, value, Icon]) => (
                    <div key={String(label)} className="group rounded-xl bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon size={14} className="text-slate-400 transition-transform group-hover:scale-110" /></div><p className="mt-2 text-2xl font-semibold text-slate-950"><AnimatedNumber value={Number(value)} /></p></div>
                  ))}
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Channels</p><p className="text-xs text-slate-400">Volume</p></div><div className="mt-4 space-y-4">{stats.notifications.byChannel.map((item) => { const Icon = channelIcons[item.channel as keyof typeof channelIcons] ?? Bell; return <div key={item.channel} className="group"><div className="mb-1.5 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-600"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100"><Icon size={14} /></span>{item.channel}</span><span className="text-sm font-semibold text-slate-800">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700 transition-all duration-500 group-hover:bg-slate-950" style={{ width: `${Math.max(4, Math.round((item.count / notificationMax) * 100))}%` }} /></div></div>; })}</div></div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Queue health</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Dispatcher status</h2><p className="mt-1 text-sm text-slate-500">Lock state and processing health.</p></div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-3"><ShieldCheck size={18} className={healthTone} /><div><p className="text-sm font-medium text-slate-800">Active locks</p><p className="text-xs text-slate-500">Currently processing</p></div></div><span className="text-2xl font-semibold text-slate-950"><AnimatedNumber value={stats.notifications.locked} /></span></div>
                  <div className={`flex items-center justify-between rounded-xl border p-4 ${stats.notifications.staleLocks ? 'border-red-100 bg-red-50/70' : 'border-emerald-100 bg-emerald-50/70'}`}><div className="flex items-center gap-3"><Clock3 size={18} className={stats.notifications.staleLocks ? 'text-red-600' : 'text-emerald-600'} /><div><p className="text-sm font-medium text-slate-800">Stale locks</p><p className="text-xs text-slate-500">Older than 10 minutes</p></div></div><span className={`text-2xl font-semibold ${stats.notifications.staleLocks ? 'text-red-800' : 'text-emerald-800'}`}><AnimatedNumber value={stats.notifications.staleLocks} /></span></div>
                </div>
                <Link href="/notifications" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:gap-3 hover:text-slate-950">View notification history <ArrowRight size={15} /></Link>
              </div>
            </section>

            <section id="feedback" className="scroll-mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Feedback</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Patient experience triage</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-4 transition-transform hover:-translate-y-1"><p className="text-xs text-emerald-700">Normal</p><p className="mt-2 text-2xl font-semibold text-emerald-900"><AnimatedNumber value={stats.feedback.normal} /></p></div>
                  <div className="rounded-xl bg-amber-50 p-4 transition-transform hover:-translate-y-1"><p className="text-xs text-amber-700">Follow-up</p><p className="mt-2 text-2xl font-semibold text-amber-900"><AnimatedNumber value={stats.feedback.followUp} /></p></div>
                  <div className="rounded-xl bg-red-50 p-4 transition-transform hover:-translate-y-1"><p className="text-xs text-red-700">Critical</p><p className="mt-2 text-2xl font-semibold text-red-900"><AnimatedNumber value={stats.feedback.critical} /></p></div>
                  <div className="rounded-xl bg-slate-50 p-4 transition-transform hover:-translate-y-1"><p className="text-xs text-slate-500">Needs attention</p><p className="mt-2 text-2xl font-semibold text-slate-950"><AnimatedNumber value={stats.feedback.needsAttention} /></p></div>
                </div>
                <Link href="/feedback" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:gap-3 hover:text-slate-950">Open feedback <ArrowRight size={15} /></Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recent failures</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Delivery issues</h2><p className="mt-1 text-sm text-slate-500">Latest failed notifications surfaced for quick investigation.</p></div><Link href="/notifications" className="hidden items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-950 sm:flex">View all <ArrowRight size={15} /></Link></div>
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">{stats.notifications.recentFailures.length ? <div className="divide-y divide-slate-100">{stats.notifications.recentFailures.map((item) => { const expanded = expandedFailure === item.notification_id; return <div key={item.notification_id} className="transition-colors hover:bg-slate-50"><button type="button" onClick={() => setExpandedFailure(expanded ? null : item.notification_id)} className="w-full px-4 py-3 text-left"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">#{item.notification_id} · {item.notification_type ?? 'Notification'}</p><div className="flex items-center gap-2"><span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Failed</span><ChevronDown size={15} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} /></div></div><p className="mt-1 text-xs text-slate-500">{item.recipient ?? 'Unknown recipient'} · {item.channel ?? 'Unknown channel'}{item.appointment_id ? ` · Appointment #${item.appointment_id}` : ''}</p>{!expanded && <p className="mt-1 truncate text-xs text-slate-400">{item.dispatch_last_error ?? 'No dispatcher error recorded'}</p>}</button>{expanded && <div className="border-t border-slate-100 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Error detail</p><p className="mt-1 break-words text-xs leading-5 text-slate-600">{item.dispatch_last_error ?? 'No dispatcher error recorded'}</p><Link href={`/notifications/${item.notification_id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-slate-950">Open notification <ArrowRight size={12} /></Link></div>}</div>; })}</div> : <div className="p-8 text-center text-sm text-slate-500">No failed notifications recorded.</div>}</div>
              </div>
            </section>

            <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>CarePlus operational analytics</span>
              <span>Data is loaded directly from the current system state.</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
