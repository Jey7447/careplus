import { ArrowLeft, Bell, CalendarDays, CheckCircle2, ClipboardList, Clock3, HeartPulse, LayoutDashboard, Mail, Phone, Settings, Stethoscope, Users, XCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Feedback', '/feedback', Bell],
  ['Settings', '/settings', Settings],
] as const;

type PageProps = { params: Promise<{ id: string }> };
export const dynamic = 'force-dynamic';

function formatDateTime(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

function statusMeta(status: string) {
  if (status === 'Delivered') return { label: 'Delivered', Icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (status === 'Failed') return { label: 'Failed', Icon: XCircle, className: 'border-red-200 bg-red-50 text-red-700' };
  if (status === 'Sent') return { label: 'Sent', Icon: CheckCircle2, className: 'border-slate-200 bg-slate-50 text-slate-700' };
  return { label: status || 'Pending', Icon: Clock3, className: 'border-amber-200 bg-amber-50 text-amber-700' };
}

export default async function NotificationDetailsPage({ params }: PageProps) {
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

  const { id } = await params;
  const notificationId = Number(id);
  if (!Number.isSafeInteger(notificationId) || notificationId < 1) notFound();

  const { data: notification, error } = await supabase
    .from('notifications')
    .select('notification_id, appointment_id, recipient, recipient_contact, channel, message, status, notification_type, sent_at, delivered_at, twilio_message_sid')
    .eq('notification_id', notificationId)
    .maybeSingle();
  if (error || !notification) notFound();

  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';
  const meta = statusMeta(notification.status ?? '');
  const StatusIcon = meta.Icon;

  return (
    <main className="min-h-screen bg-[#f3f8f7] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><HeartPulse size={22} /></div>
              <div><b className="text-sm text-slate-950">CarePlus</b><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operations workspace</p></div>
            </div>
          </div>
          <nav className="flex-1 px-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Notifications' ? 'bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Notifications' && <span className="ml-auto text-teal-500">→</span>}
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
            <div className="relative mx-auto max-w-[1500px]">
              <Link href="/notifications" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"><ArrowLeft size={16} /> Back to notifications</Link>
              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300 sm:text-xs"><Bell size={14} /> CarePlus · Communication record</div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Message to {notification.recipient ?? 'recipient'}.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Review exactly what was sent, where it was sent, and how the delivery journey ended.</p>
                </div>
                <div className="shrink-0 text-left lg:text-right"><p className="text-xs text-slate-500">Notification</p><p className="mt-1 text-sm font-medium">#{notification.notification_id}</p><p className="mt-1 text-xs text-slate-500">Signed in as {email}</p></div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-5 lg:space-y-7 lg:p-8">
            <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-[26px] bg-teal-700 p-6 text-white shadow-xl shadow-teal-900/10 lg:p-7">
                <div className="absolute -right-8 -top-16 h-40 w-40 rounded-full bg-teal-400/20" />
                <div className="relative flex items-start justify-between gap-5">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100">Delivery pulse</p><p className="mt-5 text-3xl font-semibold tracking-tight">{meta.label}</p><p className="mt-2 max-w-md text-sm leading-6 text-teal-50/80">Current delivery state recorded for this patient communication.</p></div>
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-white`}><StatusIcon size={22} /></div>
                </div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Channel</p><p className="mt-5 text-2xl font-semibold">{notification.channel ?? 'Not recorded'}</p><p className="mt-2 text-sm text-slate-500">Destination used for this notification.</p></div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Notification type</p><p className="mt-5 break-words text-2xl font-semibold">{notification.notification_type ?? 'Notification'}</p><p className="mt-2 text-sm text-slate-500">Operational event that generated this message.</p></div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Mail size={19} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">The message</p><h2 className="mt-1 text-xl font-semibold">What CarePlus sent</h2></div></div>
                <div className="mt-6 rounded-[22px] bg-slate-50 p-5 sm:p-6"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{notification.message ?? 'No message recorded.'}</p></div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700"><ClipboardList size={19} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Delivery trail</p><h2 className="mt-1 text-xl font-semibold">What happened next</h2></div></div>
                <div className="relative mt-7 space-y-6 pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-slate-200">
                  <div className="relative"><span className="absolute -left-6 top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-teal-600 ring-4 ring-teal-50" /><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Sent</p><p className="mt-1 text-sm font-medium">{formatDateTime(notification.sent_at)}</p></div>
                  <div className="relative"><span className="absolute -left-6 top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-slate-300 ring-4 ring-slate-50" /><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Delivered</p><p className="mt-1 text-sm font-medium">{formatDateTime(notification.delivered_at)}</p></div>
                </div>
                <div className="mt-7 border-t border-slate-100 pt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Twilio message SID</p><p className="mt-2 break-all font-mono text-xs text-slate-600">{notification.twilio_message_sid ?? 'Not recorded'}</p></div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Recipient</p><h2 className="mt-2 text-xl font-semibold">{notification.recipient ?? 'Recipient not recorded'}</h2><div className="mt-6 space-y-4 text-sm"><div><p className="text-xs text-slate-400">Contact</p><p className="mt-1 flex items-center gap-2 break-all font-medium"><Phone size={14} className="text-teal-600" />{notification.recipient_contact ?? 'Not recorded'}</p></div><div><p className="text-xs text-slate-400">Appointment</p>{notification.appointment_id ? <Link href={`/appointments/${notification.appointment_id}`} className="mt-1 inline-flex items-center gap-2 font-medium text-slate-800 hover:text-teal-700"><CalendarDays size={14} className="text-teal-600" />Appointment #{notification.appointment_id}</Link> : <p className="mt-1">Not linked to an appointment</p>}</div></div></div>
              <div className="rounded-[26px] border border-amber-200 bg-amber-50/70 p-6 shadow-sm lg:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Operational context</p><h2 className="mt-2 text-xl font-semibold">Keep the communication loop visible.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">This record preserves the message, destination and delivery timestamps so staff can trace patient communications without leaving the CarePlus workspace.</p></div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
