import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
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
import StatusActions from './status-actions';

const navigation = [
  ['Dashboard', '/dashboard', HeartPulse],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
] as const;

type PageProps = { params: Promise<{ id: string }> };

type Rating = number | null;

function Stars({ rating, compact = false }: { rating: Rating; compact?: boolean }) {
  if (rating === null) return <span className="text-sm text-slate-400">Not provided</span>;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={compact ? 15 : 18} className={index < rating ? 'fill-current text-teal-600' : 'text-slate-200'} />
      ))}
      <span className={`${compact ? 'text-xs' : 'text-sm'} ml-1 font-semibold text-slate-700`}>{rating}/5</span>
    </span>
  );
}

function statusClass(status: string) {
  if (status === 'New') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'Reviewed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Follow-up Required') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'Resolved') return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
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

  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${feedback.patient_id}`;
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Not linked';
  const averageRating = [feedback.overall_rating, feedback.doctor_rating, feedback.facility_rating, feedback.waiting_time_rating]
    .filter((value): value is number => typeof value === 'number')
    .reduce((sum, value, _, values) => sum + value / values.length, 0);

  return (
    <main className="min-h-screen bg-[#f4f8f7]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/10"><HeartPulse size={22} /></div>
            <div><b className="text-sm text-slate-950">CarePlus</b><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Operations</p></div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Feedback' ? 'bg-teal-50 font-medium text-teal-800 ring-1 ring-teal-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>{label === 'Feedback' && <ArrowRight size={15} className="ml-auto" />}
              </Link>
            ))}
          </nav>
          <div className="m-4 rounded-2xl bg-slate-950 p-4 text-white"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">Patient experience</p><p className="mt-2 text-sm leading-5 text-slate-300">Listen carefully, act clearly, and close the loop.</p></div>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="border-b border-slate-200/80 bg-white lg:hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/10"><HeartPulse size={20} /></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-slate-950">CarePlus</p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Operations</p></div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navigation.map(([label, href, Icon]) => <Link key={label} href={href} aria-current={label === 'Feedback' ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium whitespace-nowrap transition ${label === 'Feedback' ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-100' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={15} /><span>{label}</span></Link>)}
            </nav>
          </div>

          <header className="relative overflow-hidden bg-slate-950 px-5 py-7 text-white sm:px-6 sm:py-8 lg:px-12 lg:py-10">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="absolute bottom-[-120px] right-1/3 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />
            <div className="relative mx-auto max-w-7xl">
              <Link href="/feedback" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft size={16} /> Back to feedback</Link>
              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300 sm:text-xs"><MessageSquareText size={14} /> CarePlus · Patient Experience</div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{patientName}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">Feedback #{feedback.feedback_id} · submitted {formatDate(feedback.submitted_at)}</p>
                </div>
                <div className="shrink-0">
                  <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(feedback.follow_up_status)}`}>{feedback.follow_up_status}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-5 lg:space-y-7 lg:p-10">
            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-[26px] bg-teal-700 p-6 text-white shadow-xl shadow-teal-900/10 sm:p-7 lg:rounded-[28px] lg:p-8">
                <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-teal-400/25" />
                <div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">EXPERIENCE PULSE</p><p className="mt-4 text-4xl font-semibold tracking-tight">{averageRating ? averageRating.toFixed(1) : '—'}</p><p className="mt-1 font-medium">average rating</p><div className="mt-4"><Stars rating={averageRating ? Math.round(averageRating) : null} /></div><p className="mt-4 text-sm leading-6 text-teal-50">A quick read of how this patient experienced the visit across the four recorded measures.</p></div>
              </div>
              {[
                ['Overall', feedback.overall_rating],
                ['Care provider', feedback.doctor_rating],
                ['Facility', feedback.facility_rating],
              ].map(([label, rating]) => (
                <div key={label as string} className="rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-slate-200/80 lg:rounded-[28px] lg:p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label as string}</p><div className="mt-5"><Stars rating={rating as Rating} /></div><p className="mt-3 text-sm leading-6 text-slate-400">Patient rating for this part of the experience.</p></div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
              <div className="space-y-6">
                <article className="rounded-[26px] bg-white shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><MessageSquareText size={19} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">THE VOICE OF THE PATIENT</p><h2 className="mt-1 font-semibold text-slate-950">What they told us</h2></div></div>
                  <div className="p-5 sm:p-6">
                    {feedback.comments ? <blockquote className="text-base leading-8 text-slate-700 sm:text-lg">“{feedback.comments}”</blockquote> : <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No written comment was provided with this response.</div>}
                    <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                      {feedback.feedback_category && <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800">{feedback.feedback_category}</span>}
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">Submitted {formatDateTime(feedback.submitted_at)}</span>
                    </div>
                  </div>
                </article>

                <article className="rounded-[26px] bg-white shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><CalendarDays size={19} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">VISIT CONTEXT</p><h2 className="mt-1 font-semibold text-slate-950">The visit behind the feedback</h2></div></div>
                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div><p className="text-xs text-slate-500">Appointment</p><p className="mt-1 font-medium text-slate-900">{appointment ? `#${appointment.appointment_id}` : 'Not linked'}</p></div>
                    <div><p className="text-xs text-slate-500">Visit type</p><p className="mt-1 font-medium text-slate-900">{appointment?.appointment_type ?? 'Not recorded'}</p></div>
                    <div><p className="text-xs text-slate-500">Date & time</p><p className="mt-1 font-medium text-slate-900">{appointment ? `${formatDate(appointment.appointment_date)} · ${appointment.appointment_time}` : 'Not recorded'}</p></div>
                    <div><p className="text-xs text-slate-500">Appointment status</p><p className="mt-1 font-medium text-slate-900">{appointment?.appointment_status ?? 'Not recorded'}</p></div>
                    {appointment?.reason_for_visit && <div className="sm:col-span-2"><p className="text-xs text-slate-500">Reason for visit</p><p className="mt-1 text-sm leading-6 text-slate-700">{appointment.reason_for_visit}</p></div>}
                  </div>
                </article>
              </div>

              <div className="space-y-6">
                <article className="rounded-[26px] bg-white shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><UserRound size={19} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">PATIENT</p><h2 className="mt-1 font-semibold text-slate-950">{patientName}</h2></div></div>
                  <div className="space-y-3 p-5 sm:p-6"><p className="text-xs text-slate-400">Patient #{feedback.patient_id}</p>{patient?.phone_number && <a href={`tel:${patient.phone_number}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"><Phone size={15} /> {patient.phone_number}</a>}{patient?.email && <a href={`mailto:${patient.email}`} className="flex items-center gap-2 break-all text-sm text-slate-600 hover:text-teal-700"><Mail size={15} /> {patient.email}</a>}</div>
                </article>

                <article className="rounded-[26px] bg-white shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Stethoscope size={19} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">CARE PROVIDER</p><h2 className="mt-1 font-semibold text-slate-950">{doctorName}</h2></div></div>
                  <div className="space-y-3 p-5 sm:p-6"><p className="text-sm text-slate-500">{doctor?.specialty ?? 'Specialty not recorded'}</p>{doctor?.phone && <a href={`tel:${doctor.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"><Phone size={15} /> {doctor.phone}</a>}{doctor?.email && <a href={`mailto:${doctor.email}`} className="flex items-center gap-2 break-all text-sm text-slate-600 hover:text-teal-700"><Mail size={15} /> {doctor.email}</a>}</div>
                </article>

                {branch && <article className="rounded-[26px] bg-white shadow-sm ring-1 ring-slate-200/80"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><MapPin size={19} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">CARE LOCATION</p><h2 className="mt-1 font-semibold text-slate-950">{branch.name}</h2></div></div><div className="p-5 sm:p-6"><p className="text-sm leading-6 text-slate-500">{branch.address ?? 'Address not recorded'}</p></div></article>}
              </div>
            </section>

            <StatusActions feedbackId={feedback.feedback_id} currentStatus={feedback.follow_up_status as 'New' | 'Reviewed' | 'Follow-up Required' | 'Resolved'} />

            <section className="rounded-[24px] border border-teal-100 bg-teal-50/60 p-5 sm:p-6">
              <div className="flex gap-3"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-teal-700" /><div><p className="text-sm font-semibold text-slate-900">Close the loop</p><p className="mt-1 text-sm leading-6 text-slate-600">Use the status above to keep this experience moving through review, follow-up and resolution. The latest record update is {formatDateTime(feedback.updated_at ?? feedback.created_at)}.</p></div></div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
