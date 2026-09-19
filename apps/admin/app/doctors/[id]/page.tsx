import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartPulse,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  Settings,
  Stethoscope,
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

type Params = Promise<{ id: string }>;

export const dynamic = 'force-dynamic';

function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(`${value}T12:00:00+01:00`));
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function statusClass(status: string) {
  if (status === 'Confirmed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  if (status === 'Scheduled') return 'border-blue-400/20 bg-blue-400/10 text-blue-200';
  if (status === 'Completed') return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
  if (status === 'Cancelled') return 'border-red-400/20 bg-red-400/10 text-red-200';
  if (status === 'No Show') return 'border-orange-400/20 bg-orange-400/10 text-orange-200';
  return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
}

export default async function DoctorDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const doctorId = Number(id);
  if (!Number.isInteger(doctorId) || doctorId < 1) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staff } = await supabase
    .from('careplus_staff_users')
    .select('id')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();
  if (!staff) redirect('/unauthorized');

  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('doctor_id, first_name, last_name, specialty, phone, email, active, branch_id')
    .eq('doctor_id', doctorId)
    .maybeSingle();
  if (doctorError || !doctor) notFound();

  const [{ data: branch }, { data: appointments }] = await Promise.all([
    doctor.branch_id
      ? supabase.from('branches').select('*').eq('branch_id', doctor.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('appointments')
      .select('appointment_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit, patient_id')
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(100),
  ]);

  const patientIds = [...new Set((appointments ?? []).map((appointment) => appointment.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', patientIds)
    : { data: [] };
  const patientMap = new Map(
    (patients ?? []).map((patient) => [patient.patient_id, `${patient.first_name} ${patient.last_name}`]),
  );

  const branchRecord = branch as Record<string, unknown> | null;
  const branchName = branchRecord
    ? String(branchRecord.name ?? branchRecord.branch_name ?? 'CarePlus branch')
    : 'Not recorded';
  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = (appointments ?? []).filter((item) => item.appointment_date === today);
  const upcomingAppointments = (appointments ?? []).filter(
    (item) =>
      ['Scheduled', 'Confirmed'].includes(item.appointment_status) &&
      (item.appointment_date > today ||
        (item.appointment_date === today && item.appointment_time >= new Date().toTimeString().slice(0, 8))),
  );
  const completedAppointments = (appointments ?? []).filter((item) => item.appointment_status === 'Completed');
  const doctorName = `Dr. ${doctor.first_name} ${doctor.last_name}`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <HeartPulse size={22} />
            </div>
            <div>
              <b className="text-sm">CarePlus</b>
              <p className="text-xs text-slate-500">Medical Centre</p>
            </div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => (
              <Link
                key={label}
                href={href}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  label === 'Doctors'
                    ? 'bg-slate-950 font-medium text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <Icon size={18} />
                {label}
                {label === 'Doctors' && <span className="ml-auto">→</span>}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="overflow-hidden bg-slate-950 text-white">
            <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft size={16} /> Back to doctors
              </Link>

              <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10">
                    <Stethoscope size={30} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Doctor #{doctor.doctor_id}
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">{doctorName}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                      <span>{doctor.specialty ?? 'Specialty not recorded'}</span>
                      <span>·</span>
                      <span>{branchName}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{email}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total appointments</p>
                  <CalendarDays size={18} className="text-slate-400" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{appointments?.length ?? 0}</p>
                <p className="mt-1 text-sm text-slate-500">Recorded in CarePlus</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming</p>
                  <Clock3 size={18} className="text-slate-400" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{upcomingAppointments.length}</p>
                <p className="mt-1 text-sm text-slate-500">Scheduled or confirmed</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed</p>
                  <CheckCircle2 size={18} className="text-slate-400" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{completedAppointments.length}</p>
                <p className="mt-1 text-sm text-slate-500">Completed visits</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
                  <Stethoscope size={18} className="text-slate-400" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{todayAppointments.length}</p>
                <p className="mt-1 text-sm text-slate-500">Appointments today</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold">Professional profile</h2>
                    <p className="text-sm text-slate-500">Current provider and contact details</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Specialty</p>
                    <p className="mt-1 font-medium">{doctor.specialty ?? 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        doctor.active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}
                    >
                      {doctor.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                      <Phone size={14} className="text-slate-400" />
                      {doctor.phone ?? 'Not recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="mt-1 flex items-center gap-2 break-all text-sm font-medium">
                      <Mail size={14} className="text-slate-400" />
                      {doctor.email ?? 'Not recorded'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold">Care location</h2>
                    <p className="text-sm text-slate-500">Current assigned branch</p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl bg-slate-50 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-2 text-lg font-semibold">{branchName}</p>
                  {branchRecord && typeof branchRecord.address === 'string' && (
                    <p className="mt-2 text-sm text-slate-500">{branchRecord.address}</p>
                  )}
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Care schedule</p>
                    <h2 className="mt-1 text-lg font-semibold">Appointment history</h2>
                    <p className="mt-1 text-sm text-slate-400">Appointments assigned to {doctorName}.</p>
                  </div>
                  <Link
                    href={`/appointments?search=${encodeURIComponent(doctorName)}`}
                    className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
                  >
                    View appointments →
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Appointment</th>
                      <th className="px-6 py-3 font-medium">Patient</th>
                      <th className="px-6 py-3 font-medium">Date & time</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {(appointments ?? []).slice(0, 20).map((appointment) => (
                      <tr key={appointment.appointment_id} className="transition-colors hover:bg-white/[0.03]">
                        <td className="px-6 py-4">
                          <Link
                            href={`/appointments/${appointment.appointment_id}`}
                            className="font-semibold text-white hover:text-slate-300"
                          >
                            #{appointment.appointment_id}
                          </Link>
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {appointment.reason_for_visit ?? 'No reason recorded'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/patients/${appointment.patient_id}`}
                            className="font-medium text-slate-200 hover:text-white"
                          >
                            {patientMap.get(appointment.patient_id) ?? `Patient #${appointment.patient_id}`}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="font-medium text-slate-200">{formatDate(appointment.appointment_date)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{appointment.appointment_type}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(appointment.appointment_status)}`}>
                            {appointment.appointment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(appointments ?? []).length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-slate-500">No appointments found for this doctor.</div>
              )}
              {(appointments ?? []).length > 20 && (
                <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-slate-500">
                  Showing the 20 most recent appointments on this profile.
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
