import { ArrowRight, BarChart3, Bell, CalendarDays, CheckCircle2, ClipboardList, Clock3, HeartPulse, LayoutDashboard, Search, Settings, Stethoscope, Users, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
] as const;

type SearchParams = Promise<{ search?: string; status?: string; channel?: string }>;
export const dynamic = 'force-dynamic';

function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

function statusMeta(status: string) {
  if (status === 'Delivered') return { label: 'Delivered', icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (status === 'Failed') return { label: 'Failed', icon: XCircle, className: 'border-red-200 bg-red-50 text-red-700' };
  if (status === 'Sent') return { label: 'Sent', icon: CheckCircle2, className: 'border-slate-200 bg-slate-50 text-slate-700' };
  return { label: status || 'Pending', icon: Clock3, className: 'border-amber-200 bg-amber-50 text-amber-700' };
}

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
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

  const params = await searchParams;
  const search = (params.search ?? '').trim().toLowerCase();
  const status = ['Pending', 'Sent', 'Delivered', 'Failed'].includes(params.status ?? '') ? params.status! : 'All';
  const channel = ['SMS', 'Email', 'WhatsApp'].includes(params.channel ?? '') ? params.channel! : 'All';
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('notification_id, appointment_id, recipient, recipient_contact, channel, message, status, notification_type, sent_at, delivered_at')
    .order('notification_id', { ascending: false })
    .limit(100);

  const rows = notifications ?? [];
  const filteredRows = rows.filter((item) => {
    if (status !== 'All' && item.status !== status) return false;
    if (channel !== 'All' && item.channel !== channel) return false;
    if (!search) return true;
    return `${item.recipient ?? ''} ${item.recipient_contact ?? ''} ${item.message ?? ''} ${item.notification_type ?? ''} ${item.appointment_id ?? ''}`.toLowerCase().includes(search);
  });

  const counts = {
    total: rows.length,
    pending: rows.filter((n) => n.status === 'Pending').length,
    sent: rows.filter((n) => n.status === 'Sent').length,
    delivered: rows.filter((n) => n.status === 'Delivered').length,
    failed: rows.filter((n) => n.status === 'Failed').length,
  };
  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';
  const deliveryRate = rows.length ? Math.round((counts.delivered / rows.length) * 100) : 0;
  const metricCards: Array<{ label: string; value: number; caption: string; Icon: LucideIcon }> = [
    { label: 'Total', value: counts.total, caption: 'messages in view', Icon: Bell },
    { label: 'Pending', value: counts.pending, caption: 'awaiting delivery', Icon: Clock3 },
    { label: 'Delivered', value: counts.delivered, caption: 'confirmed delivered', Icon: CheckCircle2 },
    { label: 'Failed', value: counts.failed, caption: 'need attention', Icon: XCircle },
  ];

  return (
    <main className="min-h-screen bg-[#f3f8f7] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><HeartPulse size={22} /></div>
              <div><b className="text-sm text-slate-950">CarePlus</b><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operations workspace</p></div>
            </div>
            <div className="mt-6 rounded-[22px] bg-slate-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Communication centre</p>
              <p className="mt-2 text-sm font-semibold">Keep the care loop visible</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">Every patient message should be traceable from send to delivery.</p>
            </div>
          </div>
          <nav className="flex-1 px-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Notifications' ? 'bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Notifications' && <ArrowRight size={15} className="ml-auto text-teal-500" />}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4"><div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">CarePlus Administration</div></div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="border-b border-slate-200/80 bg-white lg:hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/10"><HeartPulse size={20} /></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-slate-950">CarePlus</p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Operations</p></div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navigation.map(([label, href, Icon]) => <Link key={label} href={href} aria-current={label === 'Notifications' ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-medium transition ${label === 'Notifications' ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-100' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={15} /><span>{label}</span></Link>)}
            </nav>
          </div>

          <header className="relative overflow-hidden bg-[#02091d] px-5 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="absolute bottom-[-110px] left-1/3 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />
            <div className="relative mx-auto flex max-w-[1500px] items-end justify-between gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300 sm:text-xs"><Bell size={14} /> CarePlus · Communication centre</div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Keep every message accounted for.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">See what has been sent, what arrived, and what still needs attention across the patient communication flow.</p>
              </div>
              <div className="hidden shrink-0 text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium">{email}</p></div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-5 lg:space-y-7 lg:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.55fr_repeat(4,1fr)]">
              <div className="relative overflow-hidden rounded-[26px] bg-teal-700 p-6 text-white shadow-xl shadow-teal-900/10 sm:col-span-2 xl:col-span-1">
                <div className="absolute -right-8 -top-16 h-40 w-40 rounded-full bg-teal-400/20" />
                <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100">Communication pulse</p>
                <p className="relative mt-5 text-4xl font-semibold tracking-tight">{deliveryRate}%</p>
                <p className="relative mt-1 font-medium">delivery success rate</p>
                <p className="relative mt-3 max-w-xs text-sm leading-5 text-teal-50/80">A quick read of how reliably the loaded notification queue is reaching its destination.</p>
              </div>
              {metricCards.map(({ label, value, caption, Icon }) => (
                <div key={label} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
                  <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p><Icon size={18} className="text-teal-600" /></div>
                  <p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm font-medium text-slate-700">{caption}</p>
                </div>
              ))}
            </section>

            <section className="rounded-[26px] border border-teal-100 bg-white p-5 shadow-sm lg:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Search size={18} /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">Find a message</p><h2 className="mt-1 font-semibold">Search the communication trail</h2><p className="mt-1 text-sm text-slate-500">Filter by recipient, status or channel.</p></div>
              </div>
              <form className="grid gap-3 xl:grid-cols-[1fr_180px_180px_auto]" method="get">
                <input name="search" defaultValue={params.search ?? ''} placeholder="Recipient, contact, type, message or appointment ID" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50" />
                <select name="status" defaultValue={status} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50"><option>All</option><option>Pending</option><option>Sent</option><option>Delivered</option><option>Failed</option></select>
                <select name="channel" defaultValue={channel} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50"><option>All</option><option>SMS</option><option>Email</option><option>WhatsApp</option></select>
                <button type="submit" className="rounded-xl bg-[#02091d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Apply filters</button>
              </form>
            </section>

            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">The communication trail</p><h2 className="mt-1 text-xl font-semibold">Notification history</h2><p className="mt-1 text-sm text-slate-500">Showing {filteredRows.length} of up to 100 loaded notifications.</p></div>
                {error && <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Unable to load</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[850px] w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-6 py-4 font-bold">Message</th><th className="px-6 py-4 font-bold">Recipient</th><th className="px-6 py-4 font-bold">Channel</th><th className="px-6 py-4 font-bold">Status</th><th className="px-6 py-4 font-bold">Sent</th><th className="px-6 py-4 font-bold">Delivered</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((item) => {
                      const href = `/notifications/${item.notification_id}`;
                      const meta = statusMeta(item.status ?? '');
                      const StatusIcon = meta.icon;
                      return <tr key={item.notification_id} className="group transition hover:bg-teal-50/40">
                        <td className="p-0"><Link href={href} className="block max-w-xs px-6 py-4"><p className="font-semibold text-slate-950">#{item.notification_id} · {item.notification_type ?? 'Notification'}</p><p className="mt-1 truncate text-xs text-slate-500">{item.message ?? 'No message recorded'}</p>{item.appointment_id && <p className="mt-1 text-xs text-slate-400">Appointment #{item.appointment_id}</p>}</Link></td>
                        <td className="p-0"><Link href={href} className="block px-6 py-4"><p className="font-medium text-slate-800">{item.recipient ?? 'Not recorded'}</p><p className="mt-1 text-xs text-slate-400">{item.recipient_contact ?? 'Not recorded'}</p></Link></td>
                        <td className="p-0"><Link href={href} className="block px-6 py-4 text-slate-600">{item.channel ?? 'Not recorded'}</Link></td>
                        <td className="p-0"><Link href={href} className="block px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}><StatusIcon size={13} />{meta.label}</span></Link></td>
                        <td className="p-0"><Link href={href} className="block whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(item.sent_at)}</Link></td>
                        <td className="p-0"><Link href={href} className="block whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(item.delivered_at)}</Link></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              {filteredRows.length === 0 && <div className="p-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Bell size={20} /></div><p className="mt-4 font-semibold">No messages in this view</p><p className="mt-1 text-sm text-slate-500">Try clearing a filter or searching for another recipient.</p></div>}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
