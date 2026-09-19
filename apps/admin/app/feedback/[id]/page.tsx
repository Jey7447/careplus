import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Settings,
  Star,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', HeartPulse],
  ['Appointments', '/appointments', Clock3],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', MessageSquareText],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
] as const;

type PageProps = { params: Promise<{ id: string }> };

type Person = {
  patient_id?: number;
  doctor_id?: number;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  email?: string | null;
};

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-sm text-slate-400">Not provided</span>;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={18} className={index < rating ? 'fill-current text-slate-900' : 'text-slate-200'} />
      ))}
      <span className="ml-1 text-sm font-medium text-slate-700">{rating}/5</span>
    </span>
  );
}

function statusClass(status: string) {
  if (status === 'New') return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (status === 'Reviewed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'Follow-up Required') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'Resolved') return 'bg-slate-100 text-slate-700 ring-slate-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });
}

export const dynamic = 'force-dynamic';

export default async function FeedbackDetailPage({ params }: PageProps) {
  const { id } = await params;
  const feedbackId = Number(id);
  if (!Number.isInteger(feedbackId)) notFound();

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

  const { data: feedback, error } = await supabase
    .from('patient_feedback')
    .select('feedback_id, appointment_id, patient_id, doctor_id, branch_id, overall_rating, doctor_rating, facility_rating, waiting_time_rating, comments, feedback_category, follow_up_status, submitted_at, created_at, updated_at')
    .eq('feedback_id', feedbackId)
    .maybeSingle();

  if (error || !feedback) notFound();

  const [{ data: patient }, { data: doctor }, { data: appointment }, { data: branch }] = await Promise.all([
    supabase.from('patients').select('patient_id, first_name, last_name, phone_number, email').eq('patient_id', feedback.patient_id).maybeSingle(),
    feedback.doctor_id
      ? supabase.from('doctors').select('doctor_id, first_name, last_name, phone, email, specialty').eq('doctor_id', feedback.doctor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    feedback.appointment_id
      ? supabase.from('appointments').select('appointment_id, appointment_date, appointment_time, appointment_type, appointment_status, reason_for_visit').eq('appointment_id', feedback.appointment_id).maybeSingle()
      : Promise.resolve({ data: null }),
    feedback.branch_id
      ? supabase.from('branches').select('branch_id, name, address').eq('branch_id', feedback.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

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
              <Link href="/feedback" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900">
                <ArrowLeft size={16} /> Back to feedback
              </Link>
              <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Feedback #{feedback.feedback_id}</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${feedback.patient_id}`}</h1>
                  <p className="mt-1 text-sm text-slate-500">Patient experience submitted {formatDate(feedback.submitted_at)}.</p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${statusClass(feedback.follow_up_status)}`}>
                  {feedback.follow_up_status}
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Overall experience', feedback.overall_rating],
                ['Doctor experience', feedback.doctor_rating],
                ['Facility experience', feedback.facility_rating],
                ['Waiting time', feedback.waiting_time_rating],
              ].map(([label, rating]) => (
                <div key={label as string} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{label as string}</p>
                  <div className="mt-3"><Stars rating={rating as number | null} /></div>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-6">
                <article className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><MessageSquareText size={19} /></div>
                    <div><h2 className="font-semibold text-slate-950">Patient comments</h2><p className="text-sm text-slate-500">The patient's written experience.</p></div>
                  </div>
                  <div className="p-6">
                    {feedback.comments ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{feedback.comments}</p>
                    ) : (
                      <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No written comment was provided.</div>
                    )}
                    {feedback.feedback_category && (
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{feedback.feedback_category}</p>
                      </div>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><CalendarDays size={19} /></div>
                    <div><h2 className="font-semibold text-slate-950">Appointment context</h2><p className="text-sm text-slate-500">The visit associated with this feedback.</p></div>
                  </div>
                  <div className="grid gap-5 p-6 sm:grid-cols-2">
                    <div><p className="text-xs text-slate-500">Appointment</p><p className="mt-1 font-medium text-slate-900">{appointment ? `#${appointment.appointment_id}` : 'Not linked'}</p></div>
                    <div><p className="text-xs text-slate-500">Visit type</p><p className="mt-1 font-medium text-slate-900">{appointment?.appointment_type ?? 'Not recorded'}</p></div>
                    <div><p className="text-xs text-slate-500">Date & time</p><p className="mt-1 font-medium text-slate-900">{appointment ? `${formatDate(appointment.appointment_date)} · ${appointment.appointment_time}` : 'Not recorded'}</p></div>
                    <div><p className="text-xs text-slate-500">Appointment status</p><p className="mt-1 font-medium text-slate-900">{appointment?.appointment_status ?? 'Not recorded'}</p></div>
                    {appointment?.reason_for_visit && <div className="sm:col-span-2"><p className="text-xs text-slate-500">Reason for visit</p><p className="mt-1 text-sm text-slate-700">{appointment.reason_for_visit}</p></div>}
                  </div>
                </article>
              </div>

              <div className="space-y-6">
                <article className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><UserRound size={19} /></div>
                    <div><h2 className="font-semibold text-slate-950">Patient</h2><p className="text-sm text-slate-500">Contact details.</p></div>
                  </div>
                  <div className="space-y-4 p-6">
                    <div><p className="font-medium text-slate-900">{patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${feedback.patient_id}`}</p><p className="text-xs text-slate-500">Patient #{feedback.patient_id}</p></div>
                    {patient?.phone_number && <a href={`tel:${patient.phone_number}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"><Phone size={15} /> {patient.phone_number}</a>}
                    {patient?.email && <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"><Mail size={15} /> {patient.email}</a>}
                  </div>
                </article>

                <article className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Stethoscope size={19} /></div>
                    <div><h2 className="font-semibold text-slate-950">Care provider</h2><p className="text-sm text-slate-500">Provider linked to the visit.</p></div>
                  </div>
                  <div className="space-y-4 p-6">
                    <div><p className="font-medium text-slate-900">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Not linked'}</p><p className="text-xs text-slate-500">{doctor?.specialty ?? 'Specialty not recorded'}</p></div>
                    {doctor?.phone && <a href={`tel:${doctor.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"><Phone size={15} /> {doctor.phone}</a>}
                    {doctor?.email && <a href={`mailto:${doctor.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"><Mail size={15} /> {doctor.email}</a>}
                  </div>
                </article>

                {branch && (
                  <article className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><MapPin size={19} /></div>
                      <div><h2 className="font-semibold text-slate-950">Care location</h2><p className="text-sm text-slate-500">Branch associated with the feedback.</p></div>
                    </div>
                    <div className="p-6"><p className="font-medium text-slate-900">{branch.name}</p><p className="mt-1 text-sm text-slate-500">{branch.address ?? 'Address not recorded'}</p></div>
                  </article>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex gap-3">
                <CheckCircle2 size={19} className="mt-0.5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Feedback record</p>
                  <p className="mt-1 text-sm text-slate-500">Submitted {formatDateTime(feedback.submitted_at)}. Last updated {formatDateTime(feedback.updated_at)}.</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
