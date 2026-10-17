import { ArrowRight, BarChart3, CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Plus, Search, Settings, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const ADMIN_NAVIGATION = [
  ['Dashboard', '/dashboard', LayoutDashboard], ['Appointments', '/appointments', CalendarDays], ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope], ['Notifications', '/notifications', ClipboardList], ['Feedback', '/feedback', BarChart3], ['Settings', '/settings', Settings],
] as const;
const DOCTOR_NAVIGATION = [
  ['Dashboard', '/doctor-dashboard', LayoutDashboard], ['Appointments', '/appointments', CalendarDays], ['Patients', '/patients', Users],
  ['Feedback', '/feedback', BarChart3], ['Settings', '/settings', Settings],
] as const;
const statuses = ['All', 'Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'] as const;
type SearchParams = Promise<{ status?: string; search?: string }>;
export const dynamic = 'force-dynamic';

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
  if (status === 'Scheduled') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (status === 'Confirmed') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'Checked In') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (status === 'In Progress') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (status === 'Completed') return 'bg-slate-100 text-slate-600 border-slate-200';
  if (status === 'Cancelled') return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-orange-50 text-orange-700 border-orange-100';
}

export default async function AppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase.rpc('current_careplus_staff');
  if (staffError || staffRecord?.active !== true || !['admin', 'doctor'].includes(staffRecord?.role ?? '') || (staffRecord?.role === 'doctor' && !staffRecord?.doctor_id)) redirect('/unauthorized');

  const isAdmin = staffRecord.role === 'admin';
  const doctorId = staffRecord.doctor_id ?? null;
  const navigation = isAdmin ? ADMIN_NAVIGATION : DOCTOR_NAVIGATION;
  const params = await searchParams;
  const status = statuses.includes(params.status as (typeof statuses)[number]) ? params.status : 'All';
  const search = (params.search ?? '').trim();

  let query = supabase.from('appointments').select('appointment_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit, patient_id, doctor_id').order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false }).limit(100);
  if (!isAdmin && doctorId) query = query.eq('doctor_id', doctorId);
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
  const filteredRows = search ? rows.filter((row) => `${patientMap.get(row.patient_id) ?? ''} ${doctorMap.get(row.doctor_id) ?? ''} ${row.appointment_type} ${row.reason_for_visit ?? ''}`.toLowerCase().includes(search.toLowerCase())) : rows;
  const counts = rows.reduce<Record<string, number>>((acc, row) => { acc[row.appointment_status] = (acc[row.appointment_status] ?? 0) + 1; return acc; }, {});
  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';

  return (
    <main className="min-h-screen bg-[#f4f7f7] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
          <div className="px-5 pb-5 pt-6"><div className="flex items-center gap-3 px-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><HeartPulse size={22}/></div><div><b className="text-sm">CarePlus</b><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{isAdmin ? 'Operations workspace' : 'Clinical workspace'}</p></div></div><div className="mt-6 rounded-[22px] bg-slate-950 p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">{isAdmin ? 'Operations' : 'Clinical flow'}</p><p className="mt-2 text-sm font-semibold">{isAdmin ? 'Keep the day moving' : 'Your schedule at a glance'}</p><p className="mt-2 text-xs leading-5 text-slate-400">{isAdmin ? 'Appointments, people and patient experience in one workspace.' : 'Review your assigned visits and move patients through care.'}</p></div></div>
          <nav className="flex-1 px-3"><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>{navigation.map(([label, href, Icon]) => <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Appointments' ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon size={18}/><span>{label}</span>{label === 'Appointments' && <ArrowRight size={15} className="ml-auto text-teal-500"/>}</Link>)}</nav>
          <div className="border-t border-slate-200 p-4"><div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">{isAdmin ? 'CarePlus Administration' : 'CarePlus Doctor Workspace'}</div></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white lg:px-10 lg:py-9"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl"/><div className="absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"/><div className="relative mx-auto flex max-w-[1500px] items-end justify-between gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">{isAdmin ? 'Care delivery' : 'Clinical schedule'}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Appointments</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{isAdmin ? "The day ahead, the people moving through the clinic, and the visits that need action." : 'Your assigned visits, ready to review and move through the clinical flow.'}</p></div>{isAdmin && <Link href="/appointments/new" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-100"><Plus size={17}/> New appointment</Link>}</div></header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[["Scheduled", counts.Scheduled ?? 0, 'bg-blue-50', 'text-blue-700'], ['Confirmed', counts.Confirmed ?? 0, 'bg-emerald-50', 'text-emerald-700'], ['Completed', counts.Completed ?? 0, 'bg-slate-100', 'text-slate-700'], ['Cancelled', counts.Cancelled ?? 0, 'bg-amber-50', 'text-amber-700']].map(([label, value, tone, ink]) => <div key={label} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tone} ${ink}`}>{label}</span><CalendarDays size={18} className="text-slate-300"/></div><p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">appointments in this view</p></div>)}
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">Find a visit</p><h2 className="mt-2 text-xl font-semibold">Search the appointment flow</h2><p className="mt-1 text-sm text-slate-500">Search by patient, doctor, type or reason for visit.</p></div><div className="text-xs text-slate-400">Showing {filteredRows.length} of up to 100 loaded</div></div><form className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_auto]" method="get"><label><span className="sr-only">Search</span><div className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input name="search" defaultValue={search} placeholder="Patient, doctor, type or reason" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"/></div></label><label><span className="sr-only">Status</span><select name="status" defaultValue={status} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><button type="submit" className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">Apply filters</button></form></section>

            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">{isAdmin ? 'Operations board' : 'Clinical board'}</p><h2 className="mt-1 text-lg font-semibold">Appointment records</h2></div>{error && <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Unable to load</span>}</div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-6 py-4 font-bold">Visit</th><th className="px-6 py-4 font-bold">Patient</th><th className="px-6 py-4 font-bold">Doctor</th><th className="px-6 py-4 font-bold">Date & time</th><th className="px-6 py-4 font-bold">Type</th><th className="px-6 py-4 font-bold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map((appointment) => { const href = `/appointments/${appointment.appointment_id}`; return <tr key={appointment.appointment_id} className="group transition hover:bg-teal-50/30"><td className="px-6 py-4"><Link href={href} className="font-semibold text-slate-950 hover:text-teal-700">#{appointment.appointment_id}</Link></td><td className="px-6 py-4"><Link href={href}><p className="font-semibold text-slate-800">{patientMap.get(appointment.patient_id) ?? 'Unknown patient'}</p><p className="mt-1 text-xs text-slate-500">{appointment.reason_for_visit ?? 'No reason recorded'}</p></Link></td><td className="px-6 py-4"><Link href={href}><p className="font-medium text-slate-800">{doctorMap.get(appointment.doctor_id) ?? 'Unknown doctor'}</p><p className="mt-1 text-xs text-slate-500">{specialtyMap.get(appointment.doctor_id) ?? ''}</p></Link></td><td className="px-6 py-4 whitespace-nowrap"><Link href={href}><p className="font-medium text-slate-800">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(appointment.appointment_time)}</p></Link></td><td className="px-6 py-4 whitespace-nowrap text-slate-600">{appointment.appointment_type}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(appointment.appointment_status)}`}>{appointment.appointment_status}</span></td></tr>; })}</tbody></table></div>{filteredRows.length === 0 && <div className="px-6 py-14 text-center"><CalendarDays className="mx-auto text-slate-300" size={26}/><p className="mt-3 text-sm font-semibold text-slate-700">No appointments in this view</p><p className="mt-1 text-xs text-slate-500">Try another status or search term.</p></div>}</section>

            {isAdmin && <div className="rounded-[22px] border border-teal-100 bg-teal-50/60 px-5 py-4 text-sm text-teal-900"><span className="font-semibold">Operations note:</span> appointment changes here flow into the same CarePlus clinical workspace used by doctors.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
