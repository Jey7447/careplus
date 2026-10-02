import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Pill,
  Settings,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value + 'T12:00:00+01:00'));
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export default async function DoctorDashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staff } = await supabase
    .from('careplus_staff_users')
    .select('id, doctor_id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'doctor')
    .maybeSingle();

  if (!staff?.doctor_id) redirect('/unauthorized');

  const doctorId = staff.doctor_id;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: doctor }, { data: appointments }] = await Promise.all([
    supabase.from('doctors').select('doctor_id, first_name, last_name, specialty').eq('doctor_id', doctorId).maybeSingle(),
    supabase
      .from('appointments')
      .select('appointment_id, patient_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', today)
      .order('appointment_date')
      .order('appointment_time')
      .limit(50),
  ]);

  if (!doctor) redirect('/unauthorized');

  const patientIds = [...new Set((appointments ?? []).map((a) => a.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from('patients').select('patient_id, first_name, last_name, gender, date_of_birth').in('patient_id', patientIds)
    : { data: [] };

  const patientMap = new Map((patients ?? []).map((p) => [p.patient_id, p]));
  const todayQueue = (appointments ?? []).filter((a) => a.appointment_date === today);
  const waiting = todayQueue.filter((a) => ['Checked In', 'In Progress'].includes(a.appointment_status));
  const upcoming = (appointments ?? []).filter((a) => ['Scheduled', 'Confirmed'].includes(a.appointment_status));

  const encounterIds = todayQueue.map((a) => a.appointment_id);
  const { data: encounters } = encounterIds.length
    ? await supabase.from('encounters').select('encounter_id, appointment_id, patient_id, status, chief_complaint, started_at').in('appointment_id', encounterIds)
    : { data: [] };
  const encounterMap = new Map((encounters ?? []).map((e) => [e.appointment_id, e]));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><HeartPulse size={22} /></div>
            <div><b className="text-sm">CarePlus</b><p className="text-xs text-slate-500">Doctor Workspace</p></div>
          </div>
          <nav className="flex-1 px-3">
            <Link href="/doctor-dashboard" className="mb-1 flex items-center gap-3 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-medium text-white shadow-sm"><Stethoscope size={18} />My Dashboard</Link>
            <Link href="/patients" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><UserRound size={18} />Patients</Link>
            <Link href="/appointments" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><CalendarDays size={18} />Appointments</Link>
            <Link href="/settings" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><Settings size={18} />Settings</Link>
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">Clinical workspace</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="bg-slate-950 text-white">
            <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Doctor Dashboard</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Good day, Dr. {doctor.last_name}</h1>
                  <p className="mt-1 text-sm text-slate-400">{doctor.specialty ?? 'Clinical practice'} · Your patient queue for today</p>
                </div>
                <div className="text-sm text-slate-400">{formatDate(today)}</div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><p className="text-xs uppercase tracking-wide text-slate-500">Today's patients</p><CalendarDays size={18} className="text-slate-400" /></div><p className="mt-3 text-3xl font-semibold">{todayQueue.length}</p><p className="mt-1 text-sm text-slate-500">Appointments on your list</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><p className="text-xs uppercase tracking-wide text-slate-500">Waiting</p><Clock3 size={18} className="text-slate-400" /></div><p className="mt-3 text-3xl font-semibold">{waiting.length}</p><p className="mt-1 text-sm text-slate-500">Checked in or in progress</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><p className="text-xs uppercase tracking-wide text-slate-500">Upcoming</p><Activity size={18} className="text-slate-400" /></div><p className="mt-3 text-3xl font-semibold">{upcoming.length}</p><p className="mt-1 text-sm text-slate-500">Scheduled or confirmed</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><p className="text-xs uppercase tracking-wide text-slate-500">Active encounters</p><FileText size={18} className="text-slate-400" /></div><p className="mt-3 text-3xl font-semibold">{(encounters ?? []).filter((e) => ['Draft', 'In Progress'].includes(e.status)).length}</p><p className="mt-1 text-sm text-slate-500">Clinical work in progress</p></div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Patient queue</p><h2 className="mt-1 text-lg font-semibold">Today's consultations</h2><p className="mt-1 text-sm text-slate-500">Patients assigned to you, ordered by appointment time.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{todayQueue.length} today</span></div>
                <div className="mt-5 space-y-3">
                  {todayQueue.map((appointment) => {
                    const patient = patientMap.get(appointment.patient_id);
                    const encounter = encounterMap.get(appointment.appointment_id);
                    return <Link key={appointment.appointment_id} href={`/patients/${appointment.patient_id}`} className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-400 hover:shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100"><UserRound size={18} className="text-slate-500" /></div><div className="min-w-0"><p className="font-semibold">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}</p><p className="mt-1 truncate text-sm text-slate-500">{appointment.reason_for_visit ?? appointment.appointment_type}</p></div></div>
                        <div className="flex items-center gap-3 text-sm"><span className="text-slate-500">{formatTime(appointment.appointment_time)}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">{encounter?.status ?? appointment.appointment_status}</span></div>
                      </div>
                    </Link>;
                  })}
                  {todayQueue.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center"><CalendarDays className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-medium">No patients scheduled today</p><p className="mt-1 text-xs text-slate-500">Your queue will appear here when appointments are assigned.</p></div>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><AlertTriangle size={18} /></div><div><h2 className="font-semibold">Clinical focus</h2><p className="text-sm text-slate-500">Quick reminders for today's work.</p></div></div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-medium">Start encounters from the patient queue</p><p className="mt-1 text-xs leading-5 text-slate-500">Each consultation should become a clinical encounter before documentation is completed.</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-medium">Review allergies before prescribing</p><p className="mt-1 text-xs leading-5 text-slate-500">Allergy history is part of the longitudinal patient record and should be checked before medication decisions.</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-medium">Document the clinical plan</p><p className="mt-1 text-xs leading-5 text-slate-500">Capture the assessment and plan inside the encounter so the record remains longitudinal.</p></div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Pill size={18} /></div><div><h2 className="font-semibold">Clinical workflow</h2><p className="text-sm text-slate-500">The next layer is prescriptions and medication history.</p></div></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4"><CheckCircle2 size={18} className="text-slate-400" /><p className="mt-3 text-sm font-semibold">Encounter</p><p className="mt-1 text-xs text-slate-500">Consultation becomes a structured clinical record.</p></div>
                <div className="rounded-xl border border-dashed border-slate-300 p-4"><Pill size={18} className="text-slate-400" /><p className="mt-3 text-sm font-semibold">Prescription</p><p className="mt-1 text-xs text-slate-500">Medication, dose, route, frequency and duration will live here.</p></div>
                <div className="rounded-xl border border-dashed border-slate-300 p-4"><FileText size={18} className="text-slate-400" /><p className="mt-3 text-sm font-semibold">Follow-up</p><p className="mt-1 text-xs text-slate-500">Future appointments and clinical instructions complete the loop.</p></div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
