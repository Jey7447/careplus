import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  MessageSquareText,
  Pill,
  Settings,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

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

  const { data: doctorId, error: doctorIdError } = await supabase.rpc('current_careplus_doctor_id');
  if (doctorIdError || !doctorId) redirect('/unauthorized');

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [{ data: doctor, error: doctorError }, { data: appointments, error: appointmentsError }] = await Promise.all([
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

  if (doctorError) {
    console.error('Doctor dashboard: failed to load doctor profile', doctorError);
    throw new Error('Unable to load your doctor profile.');
  }
  if (appointmentsError) {
    console.error('Doctor dashboard: failed to load appointments', appointmentsError);
    throw new Error('Unable to load your appointments.');
  }
  if (!doctor) redirect('/unauthorized');

  const patientIds = [...new Set((appointments ?? []).map((a) => a.patient_id))];
  const { data: patients, error: patientsError } = patientIds.length
    ? await supabase.from('patients').select('patient_id, first_name, last_name, gender, date_of_birth').in('patient_id', patientIds)
    : { data: [], error: null };

  if (patientsError) {
    console.error('Doctor dashboard: failed to load patients', patientsError);
    throw new Error('Unable to load your assigned patients.');
  }

  const patientMap = new Map((patients ?? []).map((p) => [p.patient_id, p]));
  const todayQueue = (appointments ?? []).filter((a) => a.appointment_date === today);
  const waiting = todayQueue.filter((a) => ['Checked In', 'In Progress'].includes(a.appointment_status));
  const upcoming = (appointments ?? []).filter((a) => ['Scheduled', 'Confirmed'].includes(a.appointment_status));

  const encounterIds = todayQueue.map((a) => a.appointment_id);
  const { data: encounters, error: encountersError } = encounterIds.length
    ? await supabase.from('encounters').select('encounter_id, appointment_id, patient_id, status, chief_complaint, started_at').in('appointment_id', encounterIds)
    : { data: [], error: null };

  if (encountersError) {
    console.error('Doctor dashboard: failed to load encounters', encountersError);
    throw new Error('Unable to load your clinical encounters.');
  }

  const encounterMap = new Map((encounters ?? []).map((e) => [e.appointment_id, e]));

  const { data: activeAppointments, error: activeAppointmentsError } = await supabase
    .from('appointments')
    .select('appointment_id, patient_id, appointment_date, appointment_time, appointment_type, reason_for_visit')
    .eq('doctor_id', doctorId)
    .eq('appointment_status', 'In Progress')
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })
    .limit(50);

  if (activeAppointmentsError) {
    console.error('Doctor dashboard: failed to load active appointments', activeAppointmentsError);
    throw new Error('Unable to load your active encounters.');
  }

  const activeAppointmentIds = (activeAppointments ?? []).map((a) => a.appointment_id);
  const [{ data: activeEncounterRows, error: activeEncountersError }, { data: activePatients, error: activePatientsError }] = activeAppointmentIds.length
    ? await Promise.all([
        supabase.from('encounters').select('encounter_id, appointment_id, patient_id, status, chief_complaint, started_at').in('appointment_id', activeAppointmentIds).eq('status', 'In Progress'),
        supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', [...new Set((activeAppointments ?? []).map((a) => a.patient_id))]),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (activeEncountersError) {
    console.error('Doctor dashboard: failed to load active encounters', activeEncountersError);
    throw new Error('Unable to load your active encounters.');
  }
  if (activePatientsError) {
    console.error('Doctor dashboard: failed to load active encounter patients', activePatientsError);
    throw new Error('Unable to load patient details for your active encounters.');
  }

  const activePatientMap = new Map((activePatients ?? []).map((p) => [p.patient_id, p]));
  const activeAppointmentMap = new Map((activeAppointments ?? []).map((a) => [a.appointment_id, a]));
  const resumableEncounters = (activeEncounterRows ?? [])
    .map((encounter) => ({ ...encounter, appointment: activeAppointmentMap.get(encounter.appointment_id), patient: activePatientMap.get(encounter.patient_id) }))
    .filter((item) => item.appointment);

  const activeCount = (encounters ?? []).filter((e) => ['Draft', 'In Progress'].includes(e.status)).length;
  const nextAppointment = todayQueue.find((a) => ['Scheduled', 'Confirmed'].includes(a.appointment_status));
  const nextPatient = nextAppointment ? patientMap.get(nextAppointment.patient_id) : null;
  const currentAppointment = todayQueue.find((a) => a.appointment_status === 'In Progress');
  const currentPatient = currentAppointment ? patientMap.get(currentAppointment.patient_id) : null;

  return (
    <main className="min-h-screen bg-[#f3f7f5] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-teal-600 text-white shadow-[0_8px_20px_rgba(13,148,136,0.22)]"><HeartPulse size={21} /></div>
              <div><b className="text-[15px] tracking-tight">CarePlus</b><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Clinical workspace</p></div>
            </div>
          </div>
          <div className="mx-4 mb-5 rounded-2xl bg-slate-950 px-4 py-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">Today</p>
            <p className="mt-1 text-sm font-semibold">Your clinic at a glance</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Queue, consultations and unfinished clinical work in one place.</p>
          </div>
          <nav className="flex-1 px-3">
            <Link href="/doctor-dashboard" className="mb-1 flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800"><Stethoscope size={18} />My Dashboard</Link>
            <Link href="/patients" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><UserRound size={18} />Patients</Link>
            <Link href="/appointments" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><CalendarDays size={18} />Appointments</Link>
            <Link href="/feedback" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><MessageSquareText size={18} />Feedback</Link>
            <Link href="/settings" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><Settings size={18} />Settings</Link>
          </nav>
          <div className="m-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">Dr. {doctor.last_name}</p>
            <p className="mt-1 text-xs text-slate-500">{doctor.specialty ?? 'Clinical practice'}</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="relative overflow-hidden bg-slate-950 text-white">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
            <div className="absolute bottom-[-90px] left-[35%] h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
              <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300"><span className="h-1.5 w-1.5 rounded-full bg-teal-400" />Clinical command centre</div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Good day, Dr. {doctor.last_name}.</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{doctor.specialty ?? 'Clinical practice'} · Here is what needs your attention today.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                  <CalendarDays size={18} className="text-teal-300" />
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Today</p><p className="mt-0.5 text-sm font-medium">{formatDate(today)}</p></div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-7 lg:p-10">
            <section className="grid gap-4 xl:grid-cols-[1.45fr_0.8fr_0.8fr_0.8fr]">
              <div className="relative overflow-hidden rounded-[24px] bg-teal-700 p-6 text-white shadow-[0_18px_45px_rgba(15,118,110,0.18)] sm:p-7">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
                <div className="relative flex h-full flex-col justify-between gap-7">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">Now</p>
                    {currentPatient ? (
                      <><p className="mt-2 text-2xl font-semibold tracking-tight">{currentPatient.first_name} {currentPatient.last_name}</p><p className="mt-1 text-sm text-teal-100">Consultation in progress · {formatTime(currentAppointment!.appointment_time)}</p></>
                    ) : (
                      <><p className="mt-2 text-2xl font-semibold tracking-tight">Ready for your next patient</p><p className="mt-1 text-sm text-teal-100">No consultation is currently in progress.</p></>
                    )}
                  </div>
                  <Link href={currentAppointment ? `/patients/${currentAppointment.patient_id}` : '/appointments'} className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50">{currentAppointment ? 'Open patient record' : 'View appointments'}<ArrowRight size={16} /></Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><span className="rounded-xl bg-slate-100 p-2 text-slate-500"><CalendarDays size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Today</span></div>
                <p className="mt-5 text-3xl font-semibold tracking-tight">{todayQueue.length}</p><p className="mt-1 text-sm font-medium text-slate-700">Patients on your list</p><p className="mt-1 text-xs text-slate-400">Appointments scheduled today</p>
              </div>

              <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
                <div className="flex items-center justify-between"><span className="rounded-xl bg-white p-2 text-amber-700 shadow-sm"><Clock3 size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700/70">Attention</span></div>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-amber-950">{waiting.length}</p><p className="mt-1 text-sm font-medium text-amber-950">In the care flow</p><p className="mt-1 text-xs text-amber-800/70">Checked in or in progress</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><FileText size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Open work</span></div>
                <p className="mt-5 text-3xl font-semibold tracking-tight">{activeCount}</p><p className="mt-1 text-sm font-medium text-slate-700">Active encounters</p><p className="mt-1 text-xs text-slate-400">Clinical work still in progress</p>
              </div>
            </section>

            {resumableEncounters.length > 0 && (
              <section className="overflow-hidden rounded-[24px] border border-teal-200 bg-[#ecfdf8] shadow-sm">
                <div className="flex flex-col gap-3 border-b border-teal-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                  <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />Resume where you left off</div><h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">Active clinical work</h2><p className="mt-1 text-sm text-slate-600">Saved encounters that still need your attention.</p></div>
                  <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-sm">{resumableEncounters.length} active</span>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  {resumableEncounters.map((encounter) => {
                    const patient = encounter.patient;
                    const appointment = encounter.appointment!;
                    return <Link key={encounter.encounter_id} href={`/doctor-dashboard/encounters/${encounter.encounter_id}`} className="group rounded-2xl border border-teal-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 font-semibold text-teal-700">{patient ? `${patient.first_name[0]}${patient.last_name[0]}` : <UserRound size={18} />}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient record'}</p><p className="mt-1 truncate text-sm text-slate-500">{encounter.chief_complaint || appointment.reason_for_visit || appointment.appointment_type}</p></div></div><span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">In progress</span></div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-400">Encounter #{encounter.encounter_id}</span><span className="text-sm font-semibold text-teal-700 group-hover:text-teal-800">Resume <ArrowRight size={14} className="ml-1 inline transition-transform group-hover:translate-x-0.5" /></span></div>
                    </Link>;
                  })}
                </div>
              </section>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
              <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                  <div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">The day ahead</div><h2 className="mt-1.5 text-xl font-semibold tracking-tight">Patient queue</h2><p className="mt-1 text-sm text-slate-500">Your consultations, ordered by appointment time.</p></div>
                  <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{todayQueue.length} today</span>{upcoming.length > 0 && <Link href="/appointments" className="text-xs font-semibold text-teal-700 hover:text-teal-800">Full schedule <ArrowRight size={13} className="ml-0.5 inline" /></Link>}</div>
                </div>
                <div className="p-3 sm:p-4">
                  {todayQueue.length > 0 ? <div className="space-y-2">
                    {todayQueue.map((appointment, index) => {
                      const patient = patientMap.get(appointment.patient_id);
                      const encounter = encounterMap.get(appointment.appointment_id);
                      const isCurrent = appointment.appointment_status === 'In Progress';
                      const isWaiting = appointment.appointment_status === 'Checked In';
                      return <Link key={appointment.appointment_id} href={`/patients/${appointment.patient_id}`} className={`group flex items-center gap-4 rounded-2xl p-3.5 transition hover:bg-slate-50 ${isCurrent ? 'bg-teal-50/70 ring-1 ring-teal-100' : ''}`}>
                        <div className="hidden w-7 shrink-0 text-center text-[11px] font-semibold text-slate-300 sm:block">{String(index + 1).padStart(2, '0')}</div>
                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-semibold ${isCurrent ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{patient ? `${patient.first_name[0]}${patient.last_name[0]}` : <UserRound size={17} />}</div>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}</p>{isCurrent && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-800">With you</span>}</div><p className="mt-1 truncate text-sm text-slate-500">{appointment.reason_for_visit ?? appointment.appointment_type}</p></div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5"><span className="text-sm font-semibold text-slate-700">{formatTime(appointment.appointment_time)}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isCurrent ? 'bg-teal-100 text-teal-800' : isWaiting ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{encounter?.status ?? appointment.appointment_status}</span></div>
                        <ArrowRight size={16} className="hidden text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600 sm:block" />
                      </Link>;
                    })}
                  </div> : <div className="m-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm"><CalendarDays size={23} /></div><p className="mt-4 text-sm font-semibold text-slate-700">Your queue is clear</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">No patients are scheduled today. Your dashboard will update as appointments are assigned.</p></div>}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-teal-300"><Activity size={18} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300">Clinical focus</p><h2 className="mt-1 font-semibold">Keep the visit moving</h2></div></div>
                <div className="mt-6 space-y-5">
                  <div className="flex gap-3"><div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-500/15 text-teal-300"><Stethoscope size={14} /></div><div><p className="text-sm font-medium">Start with the patient record</p><p className="mt-1 text-xs leading-5 text-slate-400">Review the context before moving into documentation.</p></div></div>
                  <div className="flex gap-3"><div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400/10 text-amber-300"><AlertTriangle size={14} /></div><div><p className="text-sm font-medium">Check allergies before prescribing</p><p className="mt-1 text-xs leading-5 text-slate-400">Allergy history belongs in the decision flow, not after it.</p></div></div>
                  <div className="flex gap-3"><div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-slate-300"><CheckCircle2 size={14} /></div><div><p className="text-sm font-medium">Close the loop</p><p className="mt-1 text-xs leading-5 text-slate-400">Capture the assessment and plan before completing the encounter.</p></div></div>
                </div>
                <div className="mt-7 border-t border-white/10 pt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Next appointment</p>{nextPatient && nextAppointment ? <Link href={`/patients/${nextPatient.patient_id}`} className="group mt-2 flex items-center justify-between"><div><p className="text-sm font-semibold">{nextPatient.first_name} {nextPatient.last_name}</p><p className="mt-1 text-xs text-slate-400">{formatTime(nextAppointment.appointment_time)} · {nextAppointment.appointment_type}</p></div><ArrowRight size={17} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-teal-300" /></Link> : <p className="mt-2 text-sm text-slate-400">No upcoming consultation in today's queue.</p>}</div>
              </section>
            </div>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">CarePlus workflow</div><h2 className="mt-1.5 text-xl font-semibold tracking-tight">From consultation to continuity</h2></div><p className="max-w-md text-xs leading-5 text-slate-400">The dashboard is built around the clinical loop, so each step naturally leads to the next.</p></div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-teal-50 p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-teal-700 shadow-sm"><CheckCircle2 size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700/60">01</span></div><p className="mt-5 text-sm font-semibold text-slate-900">Encounter</p><p className="mt-1 text-xs leading-5 text-slate-500">Turn the consultation into a structured clinical record.</p></div>
                <div className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><Pill size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">02</span></div><p className="mt-5 text-sm font-semibold text-slate-900">Prescription</p><p className="mt-1 text-xs leading-5 text-slate-500">Medication, dose, route, frequency and duration will live here.</p></div>
                <div className="rounded-2xl border border-dashed border-slate-300 p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-400"><FileText size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">03</span></div><p className="mt-5 text-sm font-semibold text-slate-900">Follow-up</p><p className="mt-1 text-xs leading-5 text-slate-500">Future appointments and clinical instructions complete the loop.</p></div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
