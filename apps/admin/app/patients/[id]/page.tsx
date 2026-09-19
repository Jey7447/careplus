import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  Settings,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Settings', '/settings', Settings],
] as const;

type PageProps = { params: Promise<{ id: string }> };

function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(`${value}T12:00:00+01:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(value));
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function appointmentStatusClass(status: string) {
  if (status === 'Scheduled') return 'border-blue-400/20 bg-blue-400/10 text-blue-200';
  if (status === 'Confirmed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  if (status === 'Cancelled') return 'border-red-400/20 bg-red-400/10 text-red-200';
  if (status === 'Completed') return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
  if (status === 'No Show') return 'border-orange-400/20 bg-orange-400/10 text-orange-200';
  return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
}

function notificationStatusClass(status: string | null) {
  if (status === 'Delivered') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Failed') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'Sent') return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export const dynamic = 'force-dynamic';

export default async function PatientDetailsPage({ params }: PageProps) {
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
  const patientId = Number(id);
  if (!Number.isInteger(patientId) || patientId <= 0) notFound();

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('patient_id, first_name, last_name, phone_number, email, date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone, created_at, updated_at')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (patientError || !patient) notFound();

  const [{ data: appointments }, { data: notifications }] = await Promise.all([
    supabase
      .from('appointments')
      .select('appointment_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit, doctor_id')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(100),
    supabase
      .from('notifications')
      .select('notification_id, appointment_id, channel, status, notification_type, message, sent_at, delivered_at')
      .eq('recipient_contact', patient.phone_number ?? '')
      .order('notification_id', { ascending: false })
      .limit(100),
  ]);

  const doctorIds = [...new Set((appointments ?? []).map((appointment) => appointment.doctor_id))];
  const { data: doctors } = doctorIds.length
    ? await supabase.from('doctors').select('doctor_id, first_name, last_name, specialty').in('doctor_id', doctorIds)
    : { data: [] };
  const doctorMap = new Map((doctors ?? []).map((doctor) => [doctor.doctor_id, { name: `Dr. ${doctor.first_name} ${doctor.last_name}`, specialty: doctor.specialty }]));

  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const upcomingAppointments = (appointments ?? []).filter((appointment) =>
    ['Scheduled', 'Confirmed'].includes(appointment.appointment_status) &&
    (appointment.appointment_date > new Date().toISOString().slice(0, 10) ||
      (appointment.appointment_date === new Date().toISOString().slice(0, 10) && appointment.appointment_time >= new Date().toTimeString().slice(0, 8))),
  );
  const completedAppointments = (appointments ?? []).filter((appointment) => appointment.appointment_status === 'Completed').length;
  const deliveredNotifications = (notifications ?? []).filter((item) => item.status === 'Delivered').length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white shadow-sm"><HeartPulse size={22} /></div>
            <div><b className="text-sm">CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${label === 'Patients' ? 'bg-slate-950 font-medium text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <Icon size={18} />{label}{label === 'Patients' && <span className="ml-auto">→</span>}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="overflow-hidden bg-slate-950 text-white">
            <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
              <Link href="/patients" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"><ArrowLeft size={16} /> Back to patients</Link>
              <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10"><UserRound size={30} /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Patient #{patient.patient_id}</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">{patientName}</h1>
                    <p className="mt-1 text-sm text-slate-400">{patient.gender ?? 'Gender not recorded'} · Born {formatDate(patient.date_of_birth)}</p>
                  </div>
                </div>
                <div className="text-left md:text-right"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-200">{email}</p></div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Appointments</p><p className="mt-2 text-3xl font-semibold">{appointments?.length ?? 0}</p><p className="mt-1 text-sm text-slate-500">Total recorded</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming</p><p className="mt-2 text-3xl font-semibold">{upcomingAppointments.length}</p><p className="mt-1 text-sm text-slate-500">Scheduled or confirmed</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Delivered messages</p><p className="mt-2 text-3xl font-semibold">{deliveredNotifications}</p><p className="mt-1 text-sm text-slate-500">{completedAppointments} completed appointments</p></div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Phone size={18} /></div><div><h2 className="font-semibold">Contact information</h2><p className="text-sm text-slate-500">How CarePlus can reach this patient</p></div></div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div><p className="text-xs text-slate-500">Phone</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><Phone size={14} className="text-slate-400" />{patient.phone_number ?? 'Not recorded'}</p></div>
                  <div><p className="text-xs text-slate-500">Email</p><p className="mt-1 flex items-center gap-2 break-all text-sm font-medium"><Mail size={14} className="text-slate-400" />{patient.email ?? 'Not recorded'}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs text-slate-500">Address</p><p className="mt-1 flex items-start gap-2 text-sm"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />{patient.address ?? 'Not recorded'}</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Bell size={18} /></div><div><h2 className="font-semibold">Emergency contact</h2><p className="text-sm text-slate-500">Contact information for urgent situations</p></div></div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div><p className="text-xs text-slate-500">Name</p><p className="mt-1 text-sm font-medium">{patient.emergency_contact_name ?? 'Not recorded'}</p></div>
                  <div><p className="text-xs text-slate-500">Phone</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><Phone size={14} className="text-slate-400" />{patient.emergency_contact_phone ?? 'Not recorded'}</p></div>
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
              <div className="border-b border-white/10 px-6 py-5"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Care history</p><h2 className="mt-1 text-lg font-semibold">Appointment history</h2><p className="mt-1 text-sm text-slate-400">Every appointment associated with this patient.</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{appointments?.length ?? 0} records</span></div></div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-medium">Appointment</th><th className="px-6 py-3 font-medium">Date & time</th><th className="px-6 py-3 font-medium">Doctor</th><th className="px-6 py-3 font-medium">Type</th><th className="px-6 py-3 font-medium">Status</th></tr></thead>
                  <tbody className="divide-y divide-white/10">
                    {(appointments ?? []).map((appointment) => {
                      const doctor = doctorMap.get(appointment.doctor_id);
                      return <tr key={appointment.appointment_id} className="transition-colors hover:bg-white/[0.03]">
                        <td className="px-6 py-4"><Link href={`/appointments/${appointment.appointment_id}`} className="font-semibold text-white hover:text-slate-300">#{appointment.appointment_id}</Link><p className="mt-1 max-w-xs text-xs text-slate-500">{appointment.reason_for_visit ?? 'No reason recorded'}</p></td>
                        <td className="whitespace-nowrap px-6 py-4"><p className="font-medium text-slate-200">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)}</p></td>
                        <td className="px-6 py-4"><p className="font-medium text-slate-200">{doctor?.name ?? 'Doctor not found'}</p><p className="mt-1 text-xs text-slate-500">{doctor?.specialty ?? ''}</p></td>
                        <td className="px-6 py-4 text-slate-400">{appointment.appointment_type}</td>
                        <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${appointmentStatusClass(appointment.appointment_status)}`}>{appointment.appointment_status}</span></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              {(appointments ?? []).length === 0 && <div className="px-6 py-12 text-center text-sm text-slate-500">No appointments found for this patient.</div>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Communications</p><h2 className="mt-1 font-semibold">Notification history</h2><p className="mt-1 text-sm text-slate-500">Messages sent to this patient's registered contact.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{notifications?.length ?? 0}</span></div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {(notifications ?? []).map((item) => <div key={item.notification_id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">#{item.notification_id} · {item.notification_type ?? 'Notification'}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.message ?? 'No message recorded'}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${notificationStatusClass(item.status)}`}>{item.status ?? 'Unknown'}</span></div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"><span>{item.channel}</span>{item.appointment_id && <Link href={`/appointments/${item.appointment_id}`} className="hover:text-slate-700">Appointment #{item.appointment_id}</Link>}<span>Sent {formatDateTime(item.sent_at)}</span></div>
                </div>)}
                {(notifications ?? []).length === 0 && <p className="py-8 text-center text-sm text-slate-500 lg:col-span-2">No notifications found for this patient.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><CheckCircle2 size={18} /></div><div><h2 className="font-semibold">Record metadata</h2><p className="text-sm text-slate-500">Registration and update history</p></div></div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Registered</p><p className="mt-1 text-sm font-medium">{formatDateTime(patient.created_at)}</p></div><div><p className="text-xs text-slate-500">Last updated</p><p className="mt-1 text-sm font-medium">{formatDateTime(patient.updated_at)}</p></div></div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
