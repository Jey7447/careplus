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
import { createClient } from '../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', HeartPulse],
  ['Appointments', '/appointments', HeartPulse],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', MessageSquareText],
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
  follow_up_status: string;
  submitted_at: string;
};

type Person = { first_name: string; last_name: string };

function ratingLabel(rating: number) {
  return `${rating}/5`;
}

function statusClass(status: string) {
  if (status === 'New') return 'bg-blue-50 text-blue-700';
  if (status === 'Reviewed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Follow-up Required') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
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

  const { data: staffRecord, error: staffError } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (staffError || !staffRecord) redirect('/unauthorized');

  const params = await searchParams;
  const status = params.status && params.status !== 'All' ? params.status : null;
  const search = params.search?.trim().toLowerCase() ?? '';

  let feedbackQuery = supabase
    .from('patient_feedback')
    .select('feedback_id, appointment_id, patient_id, doctor_id, branch_id, overall_rating, doctor_rating, facility_rating, waiting_time_rating, comments, feedback_category, follow_up_status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(100);

  if (status) feedbackQuery = feedbackQuery.eq('follow_up_status', status);

  const { data: feedbackRows, error } = await feedbackQuery;
  const feedback = (feedbackRows ?? []) as FeedbackRecord[];

  const patientIds = [...new Set(feedback.map((item) => item.patient_id))];
  const doctorIds = [...new Set(feedback.map((item) => item.doctor_id).filter((id): id is number => id !== null))];

  const [{ data: patients }, { data: doctors }] = await Promise.all([
    patientIds.length ? supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', patientIds) : Promise.resolve({ data: [] as Array<{ patient_id: number; first_name: string; last_name: string }> }),
    doctorIds.length ? supabase.from('doctors').select('doctor_id, first_name, last_name').in('doctor_id', doctorIds) : Promise.resolve({ data: [] as Array<{ doctor_id: number; first_name: string; last_name: string }> }),
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

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div>
            <div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${label === 'Feedback' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon size={18} />{label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-[var(--border)] bg-white px-6 py-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <p className="text-sm font-medium text-slate-500">Patient experience</p>
              <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Feedback</h1>
                  <p className="mt-1 text-sm text-slate-500">Understand patient experience and surface feedback that needs attention.</p>
                </div>
                <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right sm:block">
                  <p className="text-xs text-slate-500">Average satisfaction</p>
                  <div className="mt-1 flex items-center justify-end gap-2 text-lg font-semibold text-slate-900"><Star size={16} className="fill-current" />{average ? average.toFixed(1) : '—'}</div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total feedback</p><p className="mt-2 text-3xl font-semibold tracking-tight">{total}</p><p className="mt-1 text-xs text-slate-500">Submitted responses</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Average rating</p><p className="mt-2 text-3xl font-semibold tracking-tight">{average ? average.toFixed(1) : '—'}<span className="text-base font-normal text-slate-400"> / 5</span></p><div className="mt-2"><Stars rating={Math.round(average)} /></div></div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Needs follow-up</p><p className="mt-2 text-3xl font-semibold tracking-tight">{followUp}</p><p className="mt-1 text-xs text-slate-500">Requires staff attention</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Reviewed / resolved</p><p className="mt-2 text-3xl font-semibold tracking-tight">{reviewed}</p><p className="mt-1 text-xs text-slate-500">Feedback handled by staff</p></div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <form className="flex flex-col gap-3 md:flex-row" method="get">
                <label className="relative flex-1"><span className="sr-only">Search feedback</span><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="search" defaultValue={params.search ?? ''} placeholder="Search patient, doctor, comment or appointment..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" /></label>
                <select name="status" defaultValue={params.status ?? 'All'} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"><option>All</option><option>New</option><option>Reviewed</option><option>Follow-up Required</option><option>Resolved</option></select>
                <button type="submit" className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800">Filter</button>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="font-semibold text-slate-950">Patient feedback</h2><p className="mt-1 text-sm text-slate-500">Recent responses and follow-up status.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{filteredFeedback.length} shown</span></div>

              {error ? (
                <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load feedback right now.</div>
              ) : filteredFeedback.length === 0 ? (
                <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><MessageSquareText size={21} /></div><h3 className="mt-4 font-semibold text-slate-900">No feedback yet</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Patient feedback will appear here once the feedback collection workflow starts receiving responses.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-medium">Patient</th><th className="px-4 py-3 font-medium">Rating</th><th className="px-4 py-3 font-medium">Experience</th><th className="px-4 py-3 font-medium">Appointment</th><th className="px-4 py-3 font-medium">Status</th><th className="px-6 py-3 text-right font-medium">Submitted</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFeedback.map((item) => {
                        const patient = patientMap.get(item.patient_id);
                        const doctor = item.doctor_id ? doctorMap.get(item.doctor_id) : null;
                        return (
                          <tr key={item.feedback_id} className="transition hover:bg-slate-50/70">
                            <td className="px-6 py-4">
                              <Link href={`/feedback/${item.feedback_id}`} className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                                <span className="flex items-center gap-2 font-medium text-slate-900 group-hover:text-slate-950">
                                  {patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${item.patient_id}`}
                                  <ArrowUpRight size={14} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-500">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Doctor not linked'}</span>
                              </Link>
                            </td>
                            <td className="px-4 py-4"><div className="flex items-center gap-2"><Stars rating={item.overall_rating} /><span className="text-xs font-medium text-slate-600">{ratingLabel(item.overall_rating)}</span></div></td>
                            <td className="max-w-sm px-4 py-4"><p className="truncate text-slate-700">{item.comments || item.feedback_category || 'No written comment'}</p></td>
                            <td className="px-4 py-4 text-slate-600">{item.appointment_id ? `#${item.appointment_id}` : 'General feedback'}</td>
                            <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.follow_up_status)}`}>{item.follow_up_status}</span></td>
                            <td className="px-6 py-4 text-right text-xs text-slate-500">{new Date(item.submitted_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5"><div className="flex gap-3"><CheckCircle2 size={19} className="mt-0.5 text-slate-500" /><div><p className="text-sm font-medium text-slate-800">Feedback workflow foundation is ready</p><p className="mt-1 text-sm text-slate-500">The admin view is connected to the new feedback table. The next step is the patient-facing collection flow and automated follow-up handling.</p></div></div></section>
          </div>
        </section>
      </div>
    </main>
  );
}
