import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  History,
  Clock3,
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
import AppointmentActions from '../appointment-actions';
import { createClient } from '../../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', HeartPulse],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Settings', '/settings', Settings],
] as const;

type PageProps = { params: Promise<{ id: string }> };

type AuditRecord = {
  audit_id: number;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
};

type DoctorSummary = {
  doctor_id: number;
  first_name: string;
  last_name: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(`${date}T12:00:00+01:00`));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatAuditDateTime(date: string | null, time: string | null) {
  if (!date && !time) return null;
  if (date && time) return `${formatDate(date)} at ${formatTime(time)}`;
  if (date) return formatDate(date);
  return formatTime(time!);
}

function statusClass(status: string) {
  if (status === 'Scheduled') return 'bg-blue-50 text-blue-700';
  if (status === 'Confirmed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Checked In') return 'bg-amber-50 text-amber-700';
  if (status === 'In Progress') return 'bg-violet-50 text-violet-700';
  if (status === 'Completed') return 'bg-slate-100 text-slate-700';
  if (status === 'Cancelled') return 'bg-red-50 text-red-700';
  return 'bg-orange-50 text-orange-700';
}

function activityText(item: AuditRecord, doctorsById: Map<number, DoctorSummary>) {
  const oldStatus = typeof item.old_values?.appointment_status === 'string' ? item.old_values.appointment_status : null;
  const newStatus = typeof item.new_values?.appointment_status === 'string' ? item.new_values.appointment_status : null;
  const oldDate = typeof item.old_values?.appointment_date === 'string' ? item.old_values.appointment_date : null;
  const newDate = typeof item.new_values?.appointment_date === 'string' ? item.new_values.appointment_date : null;
  const oldTime = typeof item.old_values?.appointment_time === 'string' ? item.old_values.appointment_time : null;
  const newTime = typeof item.new_values?.appointment_time === 'string' ? item.new_values.appointment_time : null;
  const oldDoctorId = typeof item.old_values?.doctor_id === 'number' ? item.old_values.doctor_id : null;
  const newDoctorId = typeof item.new_values?.doctor_id === 'number' ? item.new_values.doctor_id : null;

  if (item.action === 'INSERT') return { title: 'Appointment created', detail: newStatus ? `Initial status: ${newStatus}` : 'Appointment record created.' };
  if (item.action === 'DELETE') return { title: 'Appointment deleted', detail: 'The appointment record was deleted.' };
  if (oldStatus && newStatus && oldStatus !== newStatus) return { title: 'Appointment status changed', detail: `${oldStatus} → ${newStatus}` };

  const scheduleChanged = (oldDate !== null && newDate !== null && oldDate !== newDate) || (oldTime !== null && newTime !== null && oldTime !== newTime);
  const doctorChanged = oldDoctorId !== null && newDoctorId !== null && oldDoctorId !== newDoctorId;

  if (scheduleChanged || doctorChanged) {
    const oldSchedule = formatAuditDateTime(oldDate, oldTime);
    const newSchedule = formatAuditDateTime(newDate, newTime);
    const oldDoctor = oldDoctorId !== null ? doctorsById.get(oldDoctorId) : null;
    const newDoctor = newDoctorId !== null ? doctorsById.get(newDoctorId) : null;
    const oldDoctorName = oldDoctor ? `Dr. ${oldDoctor.first_name} ${oldDoctor.last_name}` : oldDoctorId !== null ? `Doctor #${oldDoctorId}` : null;
    const newDoctorName = newDoctor ? `Dr. ${newDoctor.first_name} ${newDoctor.last_name}` : newDoctorId !== null ? `Doctor #${newDoctorId}` : null;

    const details: string[] = [];
    if (scheduleChanged && oldSchedule && newSchedule) details.push(`Time: ${oldSchedule} → ${newSchedule}`);
    if (doctorChanged && oldDoctorName && newDoctorName) details.push(`Doctor: ${oldDoctorName} → ${newDoctorName}`);

    if (scheduleChanged && doctorChanged) return { title: 'Appointment rescheduled & doctor reassigned', detail: details.join(' · ') };
    if (scheduleChanged) return { title: 'Appointment rescheduled', detail: details[0] ?? 'Appointment date or time was changed.' };
    return { title: 'Doctor reassigned', detail: details[0] ?? 'The assigned doctor was changed.' };
  }

  return { title: 'Appointment updated', detail: 'Appointment information was updated.' };
}

export const dynamic = 'force-dynamic';

export default async function AppointmentDetailsPage({ params }: PageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase.from('careplus_staff_users').select('id, role, active').eq('auth_user_id', claimsData.claims.sub).eq('active', true).eq('role', 'admin').maybeSingle();
  if (staffError || !staffRecord) redirect('/unauthorized');

  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) notFound();

  const { data: appointment, error: appointmentError } = await supabase.from('appointments').select('appointment_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit, notes, created_at, patient_id, doctor_id, branch_id').eq('appointment_id', appointmentId).maybeSingle();
  if (appointmentError || !appointment) notFound();

  const [{ data: patient }, { data: doctor }, { data: branch }, { data: notifications }, { data: auditLogs }, { data: doctors }] = await Promise.all([
    supabase.from('patients').select('patient_id, first_name, last_name, phone_number, email, address').eq('patient_id', appointment.patient_id).maybeSingle(),
    supabase.from('doctors').select('doctor_id, first_name, last_name, specialty, phone, email, active').eq('doctor_id', appointment.doctor_id).maybeSingle(),
    supabase.from('branches').select('*').eq('branch_id', appointment.branch_id).maybeSingle(),
    supabase.from('notifications').select('notification_id, channel, notification_type, status, sent_at, delivered_at, recipient_contact').eq('appointment_id', appointment.appointment_id).order('notification_id', { ascending: false }),
    supabase.from('audit_logs').select('audit_id, action, old_values, new_values, changed_at').eq('table_name', 'appointments').eq('record_id', appointment.appointment_id).order('changed_at', { ascending: false }).limit(50),
    supabase.from('doctors').select('doctor_id, first_name, last_name'),
  ]);

  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown patient';
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Unknown doctor';
  const branchName = branch ? ((branch as Record<string, unknown>).name ?? (branch as Record<string, unknown>).branch_name ?? 'CarePlus branch') : 'Branch not available';
  const activities = (auditLogs ?? []) as AuditRecord[];
  const doctorsById = new Map<number, DoctorSummary>((doctors ?? []).map((item) => [item.doctor_id, item]));

  return (
    <main className="min-h-screen"><div className="flex min-h-screen">
      <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3 p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div><div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div></div>
        <nav className="flex-1 px-3">{navigation.map(([label, href, Icon]) => <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${label === 'Appointments' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}><Icon size={18} />{label}</Link>)}</nav>
        <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
      </aside>

      <section className="flex-1">
        <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-6"><div><Link href="/appointments" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 outline-none focus:outline-none focus-visible:outline-none"><ArrowLeft size={16} /> Back to appointments</Link><p className="mt-4 text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="mt-1 text-2xl font-semibold">Appointment #{appointment.appointment_id}</h1><p className="mt-1 text-sm text-slate-500">Review appointment and patient information.</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-800">{email}</p></div></div></header>

        <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><p className="text-sm text-slate-500">Appointment status</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold text-slate-900">{patientName}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(appointment.appointment_status)}`}>{appointment.appointment_status}</span></div><p className="mt-1 text-sm text-slate-500">{appointment.appointment_type}</p></div><div className="rounded-xl bg-slate-50 px-4 py-3 text-left md:text-right"><p className="text-xs text-slate-500">Appointment date & time</p><p className="mt-1 text-sm font-medium text-slate-900">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-sm text-slate-600">{formatTime(appointment.appointment_time)} · Africa/Lagos</p></div></div></section>

          <AppointmentActions appointmentId={appointment.appointment_id} currentStatus={appointment.appointment_status} />

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><UserRound size={19} /></div><div><h2 className="font-semibold">Patient information</h2><p className="text-sm text-slate-500">Registered patient details</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Full name</p><p className="mt-1 text-sm font-medium">{patientName}</p></div><div><p className="text-xs text-slate-500">Patient ID</p><p className="mt-1 text-sm font-medium">#{patient?.patient_id ?? appointment.patient_id}</p></div><div><p className="text-xs text-slate-500">Phone</p><p className="mt-1 flex items-center gap-2 text-sm"><Phone size={14} />{patient?.phone_number ?? 'Not recorded'}</p></div><div><p className="text-xs text-slate-500">Email</p><p className="mt-1 flex items-center gap-2 break-all text-sm"><Mail size={14} />{patient?.email ?? 'Not recorded'}</p></div><div className="sm:col-span-2"><p className="text-xs text-slate-500">Address</p><p className="mt-1 flex items-start gap-2 text-sm"><MapPin size={14} className="mt-0.5 shrink-0" />{patient?.address ?? 'Not recorded'}</p></div><div className="sm:col-span-2"><Link href={`/patients/${patient?.patient_id ?? appointment.patient_id}`} className="text-sm font-medium text-slate-700 hover:text-slate-900 outline-none focus:outline-none focus-visible:outline-none">View full patient record →</Link></div></div></section>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Stethoscope size={19} /></div><div><h2 className="font-semibold">Doctor information</h2><p className="text-sm text-slate-500">Assigned care provider</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Doctor</p><p className="mt-1 text-sm font-medium">{doctorName}</p></div><div><p className="text-xs text-slate-500">Specialty</p><p className="mt-1 text-sm font-medium">{doctor?.specialty ?? 'Not recorded'}</p></div><div><p className="text-xs text-slate-500">Phone</p><p className="mt-1 flex items-center gap-2 text-sm"><Phone size={14} />{doctor?.phone ?? 'Not recorded'}</p></div><div><p className="text-xs text-slate-500">Email</p><p className="mt-1 flex items-center gap-2 break-all text-sm"><Mail size={14} />{doctor?.email ?? 'Not recorded'}</p></div><div><p className="text-xs text-slate-500">Doctor status</p><p className="mt-1 text-sm">{doctor?.active ? 'Active' : 'Inactive'}</p></div><div className="sm:col-span-2"><Link href={`/doctors/${doctor?.doctor_id ?? appointment.doctor_id}`} className="text-sm font-medium text-slate-700 hover:text-slate-900 outline-none focus:outline-none focus-visible:outline-none">View doctor record →</Link></div></div></section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><CalendarDays size={19} /></div><div><h2 className="font-semibold">Appointment information</h2><p className="text-sm text-slate-500">Scheduling and clinical context</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Date</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><CalendarDays size={14} />{formatDate(appointment.appointment_date)}</p></div><div><p className="text-xs text-slate-500">Time</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><Clock3 size={14} />{formatTime(appointment.appointment_time)}</p></div><div><p className="text-xs text-slate-500">Appointment type</p><p className="mt-1 text-sm font-medium">{appointment.appointment_type}</p></div><div><p className="text-xs text-slate-500">Branch</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><MapPin size={14} />{String(branchName)}</p></div><div className="sm:col-span-2"><p className="text-xs text-slate-500">Reason for visit</p><p className="mt-1 text-sm leading-6">{appointment.reason_for_visit ?? 'No reason recorded.'}</p></div><div className="sm:col-span-2"><p className="text-xs text-slate-500">Notes</p><p className="mt-1 text-sm leading-6">{appointment.notes ?? 'No notes recorded.'}</p></div></div></section>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ClipboardList size={19} /></div><div><h2 className="font-semibold">Notification history</h2><p className="text-sm text-slate-500">Notifications associated with this appointment</p></div></div><div className="mt-6 space-y-3">{(notifications ?? []).length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No notifications recorded for this appointment.</p> : (notifications ?? []).map((notification) => <div key={notification.notification_id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-900">{notification.notification_type ?? 'Notification'}</p><p className="mt-1 text-xs text-slate-500">{notification.channel} · {notification.recipient_contact ?? 'No recipient contact'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(notification.status)}`}>{notification.status}</span></div><div className="mt-3 text-xs text-slate-500">{notification.sent_at ? `Sent ${new Date(notification.sent_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}` : 'Not sent'}{notification.delivered_at ? ` · Delivered ${new Date(notification.delivered_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}` : ''}</div></div>)}</div></section>
          </div>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><History size={19} /></div><div><h2 className="font-semibold">Appointment activity</h2><p className="text-sm text-slate-500">Recorded changes to this appointment.</p></div></div>
            <div className="mt-6 space-y-3">
              {activities.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No activity has been recorded for this appointment.</p> : activities.map((item) => {
                const activity = activityText(item, doctorsById);
                const oldStatus = typeof item.old_values?.appointment_status === 'string' ? item.old_values.appointment_status : null;
                const newStatus = typeof item.new_values?.appointment_status === 'string' ? item.new_values.appointment_status : null;
                return <div key={item.audit_id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-slate-900">{activity.title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{activity.detail}</p>{oldStatus && newStatus && oldStatus !== newStatus && <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(oldStatus)}`}>{oldStatus}</span><span className="text-xs text-slate-400">→</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(newStatus)}`}>{newStatus}</span></div>}</div><time className="shrink-0 text-xs text-slate-500">{new Date(item.changed_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</time></div></div>;
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><h2 className="font-semibold">Record metadata</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm"><div><p className="text-xs text-slate-500">Created</p><p className="mt-1 text-slate-800">{new Date(appointment.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p></div><div><p className="text-xs text-slate-500">Appointment ID</p><p className="mt-1 text-slate-800">#{appointment.appointment_id}</p></div></div></section>
        </div>
      </section>
    </div></main>
  );
}
