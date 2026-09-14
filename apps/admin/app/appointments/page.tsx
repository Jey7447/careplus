import { CalendarDays, HeartPulse, LayoutDashboard, ClipboardList, Settings, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '#', Stethoscope],
  ['Notifications', '#', ClipboardList],
  ['Settings', '#', Settings],
] as const;

const statuses = ['All', 'Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'] as const;

type SearchParams = Promise<{ status?: string; search?: string }>;

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(`${date}T12:00:00+01:00`));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
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

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase.from('careplus_staff_users').select('id, role, active').eq('auth_user_id', claimsData.claims.sub).eq('active', true).eq('role', 'admin').maybeSingle();
  if (staffError || !staffRecord) redirect('/unauthorized');

  const params = await searchParams;
  const status = statuses.includes(params.status as (typeof statuses)[number]) ? params.status : 'All';
  const search = (params.search ?? '').trim();

  let query = supabase.from('appointments').select('appointment_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit, patient_id, doctor_id').order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false }).limit(100);
  if (status !== 'All') query = query.eq('appointment_status', status);

  const { data: appointments, error } = await query;
  const rows = appointments ?? [];
  const patientIds = [...new Set(rows.map((row) => row.patient_id))];
  const doctorIds = [...new Set(rows.map((row) => row.doctor_id))];

  const [{ data: patients }, { data: doctors }] = await Promise.all([
    patientIds.length ? supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', patientIds) : Promise.resolve({ data: [], error: null }),
    doctorIds.length ? supabase.from('doctors').select('doctor_id, first_name, last_name, specialty').in('doctor_id', doctorIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const patientMap = new Map((patients ?? []).map((patient) => [patient.patient_id, `${patient.first_name} ${patient.last_name}`]));
  const doctorMap = new Map((doctors ?? []).map((doctor) => [doctor.doctor_id, `Dr. ${doctor.first_name} ${doctor.last_name}`]));
  const specialtyMap = new Map((doctors ?? []).map((doctor) => [doctor.doctor_id, doctor.specialty]));

  const filteredRows = search ? rows.filter((row) => {
    const patient = patientMap.get(row.patient_id) ?? '';
    const doctor = doctorMap.get(row.doctor_id) ?? '';
    return `${patient} ${doctor} ${row.appointment_type} ${row.reason_for_visit ?? ''}`.toLowerCase().includes(search.toLowerCase());
  }) : rows;

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.appointment_status] = (acc[row.appointment_status] ?? 0) + 1;
    return acc;
  }, {});
  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';

  return (
    <main className="min-h-screen"><div className="flex min-h-screen">
      <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3 p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div><div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div></div>
        <nav className="flex-1 px-3">{navigation.map(([label, href, Icon]) => href === '#' ? <div key={label} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400"><Icon size={18} />{label}</div> : <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${label === 'Appointments' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}><Icon size={18} />{label}</Link>)}</nav>
        <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
      </aside>
      <section className="flex-1"><header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-6"><div><p className="text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="mt-1 text-2xl font-semibold">Appointments</h1><p className="mt-1 text-sm text-slate-500">Manage and review scheduled patient appointments.</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-800">{email}</p></div></div></header>
        <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Scheduled', counts.Scheduled ?? 0], ['Confirmed', counts.Confirmed ?? 0], ['Completed', counts.Completed ?? 0], ['Cancelled', counts.Cancelled ?? 0]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>)}</div>
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><form className="grid gap-4 lg:grid-cols-[1fr_220px_auto]" method="get"><label><span className="text-sm font-medium text-slate-700">Search</span><input name="search" defaultValue={search} placeholder="Patient, doctor, type or reason" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" /></label><label><span className="text-sm font-medium text-slate-700">Status</span><select name="status" defaultValue={status} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><button type="submit" className="self-end rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Apply filters</button></form></section>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><h2 className="font-semibold">Appointment records</h2><p className="mt-1 text-sm text-slate-500">Showing {filteredRows.length} of up to 100 loaded appointments.</p></div>{error && <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">Unable to load appointments</span>}</div>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-medium">Appointment</th><th className="px-6 py-3 font-medium">Patient</th><th className="px-6 py-3 font-medium">Doctor</th><th className="px-6 py-3 font-medium">Date & time</th><th className="px-6 py-3 font-medium">Type</th><th className="px-6 py-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredRows.map((appointment) => <tr key={appointment.appointment_id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-6 py-4 font-medium"><Link href={`/appointments/${appointment.appointment_id}`} className="text-slate-900 hover:underline">#{appointment.appointment_id}</Link></td><td className="px-6 py-4"><Link href={`/appointments/${appointment.appointment_id}`} className="block"><p className="font-medium text-slate-900">{patientMap.get(appointment.patient_id) ?? 'Unknown patient'}</p><p className="mt-1 text-xs text-slate-500">{appointment.reason_for_visit ?? 'No reason recorded'}</p></Link></td><td className="px-6 py-4"><p className="font-medium text-slate-900">{doctorMap.get(appointment.doctor_id) ?? 'Unknown doctor'}</p><p className="mt-1 text-xs text-slate-500">{specialtyMap.get(appointment.doctor_id) ?? ''}</p></td><td className="whitespace-nowrap px-6 py-4"><p className="font-medium text-slate-900">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)}</p></td><td className="whitespace-nowrap px-6 py-4 text-slate-600">{appointment.appointment_type}</td><td className="whitespace-nowrap px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(appointment.appointment_status)}`}>{appointment.appointment_status}</span></td></tr>)}</tbody></table></div>
            {filteredRows.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No appointments match the current filters.</div>}
          </section>
        </div>
      </section>
    </div></main>
  );
}
