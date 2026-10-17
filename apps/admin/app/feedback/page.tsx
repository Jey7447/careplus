import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  HeartPulse,
  MessageSquareText,
  Search,
  Settings,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import FilterClear from '../filter-clear';
import { createClient } from '../../lib/supabase/server';

const ADMIN_NAVIGATION = [
  ['Dashboard', '/dashboard', HeartPulse],
  ['Appointments', '/appointments', HeartPulse],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', MessageSquareText],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
] as const;
const DOCTOR_NAVIGATION = [
  ['Dashboard', '/doctor-dashboard', HeartPulse],
  ['Appointments', '/appointments', HeartPulse],
  ['Patients', '/patients', Users],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
] as const;

type SearchParams = Promise<{ status?: string; search?: string }>;

type FeedbackRecord = {
  feedback_id: number;
  appointment_id: number | null;
  patient_id: number;
  doctor_id: number | null;
  branch_id: number | null;
  overall_rating: number;
  doctor_rating: number | null;
  facility_rating: number | null;
  waiting_time_rating: number | null;
  comments: string | null;
  feedback_category: string | null;
  triage_status: string | null;
  follow_up_status: string;
  submitted_at: string;
};

type Person = { first_name: string; last_name: string };

function ratingLabel(rating: number) {
  return `${rating}/5`;
}

function statusClass(status: string) {
  if (status === 'normal') return 'bg-emerald-50 text-emerald-700';
  if (status === 'follow_up') return 'bg-amber-50 text-amber-700';
  if (status === 'critical') return 'bg-red-50 text-red-700';
  if (status === 'New') return 'bg-blue-50 text-blue-700';
  if (status === 'Reviewed' || status === 'Resolved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Follow-up Required') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function triageLabel(status: string | null, fallback: string) {
  if (status === 'normal') return 'Normal';
  if (status === 'follow_up') return 'Follow-up Required';
  if (status === 'critical') return 'Critical';
  return fallback;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={13} className={index < rating ? 'fill-current' : 'text-slate-200'} />
      ))}
    </span>
  );
}

export const dynamic = 'force-dynamic';

export default async function FeedbackPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase.rpc('current_careplus_staff');
  if (
    staffError ||
    staffRecord?.active !== true ||
    !['admin', 'doctor'].includes(staffRecord?.role ?? '') ||
    (staffRecord?.role === 'doctor' && !staffRecord?.doctor_id)
  ) redirect('/unauthorized');

  const isAdmin = staffRecord.role === 'admin';
  const isDoctor = staffRecord.role === 'doctor';
  const doctorId = staffRecord.doctor_id ?? null;
  const navigation = isDoctor && !isAdmin ? DOCTOR_NAVIGATION : ADMIN_NAVIGATION;
  const params = await searchParams;
  const status = params.status && params.status !== 'All' ? params.status : null;
  const search = params.search?.trim().toLowerCase() ?? '';
  const triageStatuses = new Set(['normal', 'follow_up', 'critical']);
  const triageFilter = status && triageStatuses.has(status) ? status : null;
  const lifecycleFilter = status && !triageFilter ? status : null;

  let feedbackQuery = supabase
    .from('patient_feedback')
    .select('feedback_id, appointment_id, patient_id, doctor_id, branch_id, overall_rating, doctor_rating, facility_rating, waiting_time_rating, comments, feedback_category, triage_status, follow_up_status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(100);

  if (isDoctor && doctorId) feedbackQuery = feedbackQuery.eq('doctor_id', doctorId);
  if (triageFilter) feedbackQuery = feedbackQuery.eq('triage_status', triageFilter);
  else if (lifecycleFilter) feedbackQuery = feedbackQuery.eq('follow_up_status', lifecycleFilter);

  const { data: feedbackRows, error } = await feedbackQuery;
  const feedback = (feedbackRows ?? []) as FeedbackRecord[];
  const patientIds = [...new Set(feedback.map((item) => item.patient_id))];
  const doctorIds = [...new Set(feedback.map((item) => item.doctor_id).filter((id): id is number => id !== null))];

  const [{ data: patients }, { data: doctors }] = await Promise.all([
    patientIds.length
      ? supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', patientIds)
      : Promise.resolve({ data: [] as Array<{ patient_id: number; first_name: string; last_name: string }> }),
    doctorIds.length
      ? supabase.from('doctors').select('doctor_id, first_name, last_name').in('doctor_id', doctorIds)
      : Promise.resolve({ data: [] as Array<{ doctor_id: number; first_name: string; last_name: string }> }),
  ]);

  const patientMap = new Map<number, Person>((patients ?? []).map((patient) => [patient.patient_id, patient]));
  const doctorMap = new Map<number, Person>((doctors ?? []).map((doctor) => [doctor.doctor_id, doctor]));

  const filteredFeedback = feedback.filter((item) => {
    if (!search) return true;
    const patient = patientMap.get(item.patient_id);
    const doctor = item.doctor_id ? doctorMap.get(item.doctor_id) : null;
    const haystack = [
      patient ? `${patient.first_name} ${patient.last_name}` : '',
      doctor ? `${doctor.first_name} ${doctor.last_name}` : '',
      item.comments ?? '',
      item.feedback_category ?? '',
      item.appointment_id ? `#${item.appointment_id}` : '',
    ].join(' ').toLowerCase();
    return haystack.includes(search);
  });

  const total = feedback.length;
  const average = total ? feedback.reduce((sum, item) => sum + item.overall_rating, 0) / total : 0;
  const followUp = feedback.filter((item) => item.follow_up_status === 'Follow-up Required').length;
  const reviewed = feedback.filter((item) => item.follow_up_status === 'Reviewed' || item.follow_up_status === 'Resolved').length;
  const critical = feedback.filter((item) => item.triage_status === 'critical').length;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-6 py-7">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-sm"><HeartPulse size={22} /></div>
            <div><p className="font-semibold text-slate-950">CarePlus</p><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operations</p></div>
          </div>
          <nav className="flex-1 px-4">
            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${label === 'Feedback' ? 'bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {label === 'Feedback' ? <ArrowUpRight size={15} /> : null}
              </Link>
            ))}
          </nav>
          <div className="m-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">Patient experience centre</div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="border-b border-slate-800 bg-slate-950 px-5 py-4 lg:hidden">
            <div className="flex items-center gap-3 overflow-x-auto">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-500 text-white"><HeartPulse size={18} /></div>
              {navigation.map(([label, href, Icon]) => (
                <Link key={label} href={href} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${label === 'Feedback' ? 'bg-teal-400/15 text-teal-200 ring-1 ring-teal-400/30' : 'text-slate-300 hover:bg-white/10'}`}>
                  <Icon size={15} />{label}
                </Link>
              ))}
            </div>
          </div>

          <header className="relative overflow-hidden bg-slate-950 px-5 py-9 text-white lg:px-10 lg:py-12">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
            <div className="absolute bottom-0 right-1/3 h-28 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative mx-auto max-w-7xl">
              <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">CarePlus · Patient experience</p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Listen to the people we care for.</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Turn patient voices into a clearer picture of what is working, what needs attention, and where the care journey can improve.</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Average experience</p>
                  <div className="mt-1 flex items-end gap-2"><span className="text-3xl font-semibold">{average ? average.toFixed(1) : '—'}</span><span className="pb-1 text-sm text-slate-400">/ 5</span></div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-10">
            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-3xl bg-teal-700 p-6 text-white shadow-lg shadow-teal-900/10 sm:p-7">
                <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-teal-400/20" />
                <div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">Experience pulse</p><p className="mt-4 text-4xl font-semibold tracking-tight">{total}</p><p className="mt-1 text-lg font-medium">patient responses in view</p><p className="mt-3 max-w-md text-sm leading-6 text-teal-50/85">Recent feedback, triage signals and follow-up work gathered into one clinical operations view.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">{followUp} follow-up</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">{critical} critical</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">{reviewed} reviewed</span></div></div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Needs attention</p><p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{followUp}</p><p className="mt-1 font-medium text-slate-800">follow-up items</p><p className="mt-3 text-sm leading-6 text-slate-500">Feedback marked for staff action.</p></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Handled</p><p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{reviewed}</p><p className="mt-1 font-medium text-slate-800">reviewed or resolved</p><p className="mt-3 text-sm leading-6 text-slate-500">Feedback already closed by the care team.</p></div>
            </section>

            <section className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Search size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Find a response</p><p className="text-sm font-medium text-slate-900">Search the patient experience record</p></div></div>
              <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_auto_auto]" method="get">
                <label className="relative"><span className="sr-only">Search feedback</span><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="search" defaultValue={params.search ?? ''} placeholder="Patient, doctor, comment or appointment..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-50" /></label>
                <select name="status" defaultValue={params.status ?? 'All'} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-300 focus:bg-white">
                  <option value="All">All status</option><option value="normal">Normal</option><option value="follow_up">Follow-up Required</option><option value="critical">Critical</option><option value="New">New</option><option value="Reviewed">Reviewed</option><option value="Resolved">Resolved</option>
                </select>
                <button type="submit" className="h-12 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">Filter</button>
                <span className="contents" />
              </form>
              <FilterClear />
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">The experience record</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Patient voices</h2><p className="mt-1 text-sm text-slate-500">Recent responses and the action attached to each one.</p></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{filteredFeedback.length} shown</span></div>

              {error ? (
                <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-6">Unable to load feedback right now.</div>
              ) : filteredFeedback.length === 0 ? (
                <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><MessageSquareText size={21} /></div><h3 className="mt-4 font-semibold text-slate-900">No feedback matches this view</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Try clearing the search or status filter to bring the wider experience record back into view.</p></div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredFeedback.map((item) => {
                      const patient = patientMap.get(item.patient_id);
                      const doctor = item.doctor_id ? doctorMap.get(item.doctor_id) : null;
                      const displayStatus = triageLabel(item.triage_status, item.follow_up_status);
                      const displayStatusKey = item.triage_status ?? item.follow_up_status;
                      return (
                        <Link key={item.feedback_id} href={`/feedback/${item.feedback_id}`} className="block p-5 transition hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${item.patient_id}`}</p><p className="mt-0.5 text-xs text-slate-500">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Doctor not linked'}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(displayStatusKey)}`}>{displayStatus}</span></div>
                          <div className="mt-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-slate-700"><Stars rating={item.overall_rating} /><span className="font-medium">{ratingLabel(item.overall_rating)}</span></div><ArrowUpRight size={16} className="text-slate-400" /></div>
                          <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{item.comments || item.feedback_category || 'No written comment'}</p>
                          <p className="mt-3 text-xs text-slate-400">{item.appointment_id ? `Appointment #${item.appointment_id}` : 'General feedback'} · {new Date(item.submitted_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })}</p>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-medium">Patient</th><th className="px-4 py-3 font-medium">Rating</th><th className="px-4 py-3 font-medium">Experience</th><th className="px-4 py-3 font-medium">Appointment</th><th className="px-4 py-3 font-medium">Status</th><th className="px-6 py-3 text-right font-medium">Submitted</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredFeedback.map((item) => {
                          const patient = patientMap.get(item.patient_id);
                          const doctor = item.doctor_id ? doctorMap.get(item.doctor_id) : null;
                          const displayStatus = triageLabel(item.triage_status, item.follow_up_status);
                          const displayStatusKey = item.triage_status ?? item.follow_up_status;
                          return (
                            <tr key={item.feedback_id} className="transition hover:bg-slate-50/70">
                              <td className="px-6 py-4"><Link href={`/feedback/${item.feedback_id}`} className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-400"><span className="flex items-center gap-2 font-medium text-slate-900">{patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${item.patient_id}`}<ArrowUpRight size={14} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span><span className="mt-0.5 block text-xs text-slate-500">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Doctor not linked'}</span></Link></td>
                              <td className="px-4 py-4"><div className="flex items-center gap-2"><Stars rating={item.overall_rating} /><span className="text-xs font-medium text-slate-600">{ratingLabel(item.overall_rating)}</span></div></td>
                              <td className="max-w-sm px-4 py-4"><p className="truncate text-slate-700">{item.comments || item.feedback_category || 'No written comment'}</p></td>
                              <td className="px-4 py-4 text-slate-600">{item.appointment_id ? `#${item.appointment_id}` : 'General feedback'}</td>
                              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(displayStatusKey)}`}>{displayStatus}</span></td>
                              <td className="px-6 py-4 text-right text-xs text-slate-500">{new Date(item.submitted_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-3xl border border-teal-100 bg-teal-50/50 p-5 sm:p-6"><div className="flex gap-3"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-teal-700" /><div><p className="text-sm font-semibold text-slate-900">A clearer loop from voice to action</p><p className="mt-1 text-sm leading-6 text-slate-600">Feedback is connected to the clinical record so staff can move from what a patient said to the follow-up work that matters.</p></div></div></section>
          </div>
        </section>
      </div>
    </main>
  );
}
