import Link from 'next/link';
import { ArrowRight, BarChart3, Bell, CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Settings, Stethoscope, Users } from 'lucide-react';
import { getReportStats } from '../../lib/reports';

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

export const dynamic = 'force-dynamic';

function statusClass(status: string) {
  if (status === 'Completed' || status === 'Delivered') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Cancelled' || status === 'Failed') return 'bg-red-50 text-red-700';
  if (status === 'Confirmed') return 'bg-blue-50 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function ReportsPage() {
  const stats = await getReportStats();

  const kpis = [
    ['Appointments', stats.appointments.total, CalendarDays],
    ['Notifications', stats.notifications.total, Bell],
    ['Failed notifications', stats.notifications.failed, Bell],
    ['Feedback records', stats.feedback.total, BarChart3],
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
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Reports' ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Reports' && <ArrowRight size={15} className="ml-auto" />}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="bg-slate-950 px-6 py-8 text-white lg:px-10">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">CarePlus Medical Centre</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reports & Analytics</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A live operational view of appointments, communications, feedback and notification queue health.</p>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(([label, value, Icon]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon size={17} /></span></div>
                  <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Appointments</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Appointment status</h2><p className="mt-1 text-sm text-slate-500">{stats.appointments.today} appointment{stats.appointments.today === 1 ? '' : 's'} scheduled for today.</p></div>
                <div className="mt-6 space-y-3">
                  {stats.appointments.byStatus.map((item) => (
                    <div key={item.status} className="flex items-center gap-3"><div className="w-28 shrink-0 text-sm text-slate-600">{item.status}</div><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.max(4, Math.round((item.count / Math.max(stats.appointments.total, 1)) * 100))}%` }} /></div><span className={`min-w-10 rounded-full px-2 py-1 text-center text-xs font-semibold ${statusClass(item.status)}`}>{item.count}</span></div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Notifications</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Delivery pipeline</h2><p className="mt-1 text-sm text-slate-500">Current notification state across all channels.</p></div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Pending', stats.notifications.pending],
                    ['Sent', stats.notifications.sent],
                    ['Delivered', stats.notifications.delivered],
                    ['Failed', stats.notifications.failed],
                  ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div>)}
                </div>
                <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Channels</p><div className="mt-3 flex flex-wrap gap-2">{stats.notifications.byChannel.map((item) => <span key={item.channel} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">{item.channel}: {item.count}</span>)}</div></div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Feedback</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Patient experience triage</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Normal</p><p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.feedback.normal}</p></div>
                  <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Follow-up</p><p className="mt-2 text-2xl font-semibold text-amber-900">{stats.feedback.followUp}</p></div>
                  <div className="rounded-xl bg-red-50 p-4"><p className="text-xs text-red-700">Critical</p><p className="mt-2 text-2xl font-semibold text-red-900">{stats.feedback.critical}</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Needs attention</p><p className="mt-2 text-2xl font-semibold text-slate-950">{stats.feedback.needsAttention}</p></div>
                </div>
                <Link href="/feedback" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950">Open feedback <ArrowRight size={15} /></Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operational health</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Notification queue</h2><p className="mt-1 text-sm text-slate-500">Dispatcher lock state and latest failed deliveries.</p></div><Link href="/notifications" className="hidden items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-950 sm:flex">View history <ArrowRight size={15} /></Link></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><p className="text-xs text-emerald-700">Active locks</p><p className="mt-1 text-2xl font-semibold text-emerald-900">{stats.notifications.locked}</p></div><div className={`rounded-xl border p-4 ${stats.notifications.staleLocks ? 'border-red-100 bg-red-50/60' : 'border-emerald-100 bg-emerald-50/60'}`}><p className={`text-xs ${stats.notifications.staleLocks ? 'text-red-700' : 'text-emerald-700'}`}>Stale locks (&gt;10m)</p><p className={`mt-1 text-2xl font-semibold ${stats.notifications.staleLocks ? 'text-red-900' : 'text-emerald-900'}`}>{stats.notifications.staleLocks}</p></div></div>
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent failures</p></div>{stats.notifications.recentFailures.length ? <div className="divide-y divide-slate-100">{stats.notifications.recentFailures.map((item) => <Link key={item.notification_id} href={`/notifications/${item.notification_id}`} className="block px-4 py-3 transition hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">#{item.notification_id} · {item.notification_type ?? 'Notification'}</p><span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Failed</span></div><p className="mt-1 text-xs text-slate-500">{item.recipient ?? 'Unknown recipient'} · {item.channel ?? 'Unknown channel'}{item.appointment_id ? ` · Appointment #${item.appointment_id}` : ''}</p><p className="mt-1 truncate text-xs text-slate-400">{item.dispatch_last_error ?? 'No dispatcher error recorded'}</p></Link>)}</div> : <div className="p-6 text-center text-sm text-slate-500">No failed notifications recorded.</div>}</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
