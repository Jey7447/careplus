import { HeartPulse, MapPin, Stethoscope } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import FeedbackForm from './feedback-form';

type PageProps = { params: Promise<{ token: string }> };

type FeedbackRequest = {
  request_id: number;
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  doctor_name: string | null;
  specialty: string | null;
  branch_name: string | null;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  expires_at: string;
  used: boolean;
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function PatientFeedbackPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_feedback_request', { p_token: token });

  if (error || !data?.length) notFound();

  const request = data[0] as FeedbackRequest;
  const unavailable = request.used || new Date(request.expires_at).getTime() <= Date.now();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"><HeartPulse size={23} /></div>
            <div><p className="font-semibold tracking-tight">CarePlus</p><p className="text-xs text-slate-500">Medical Centre</p></div>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">Patient experience</span>
        </header>

        <div className="mx-auto mt-10 max-w-2xl sm:mt-14">
          {unavailable ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><HeartPulse size={25} /></div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Feedback link unavailable</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">This feedback link has already been used or has expired. If you believe this is a mistake, please contact CarePlus Medical Centre.</p>
            </section>
          ) : (
            <>
              <section className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Thank you for visiting</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How was your experience?</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Hi {request.patient_name.split(' ')[0]}, your feedback helps CarePlus understand what is working well and where we can improve.</p>
              </section>

              <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Stethoscope size={17} /></div><div className="min-w-0"><p className="text-xs text-slate-500">Care provider</p><p className="mt-1 truncate text-sm font-medium">{request.doctor_name ?? 'CarePlus team'}</p><p className="text-xs text-slate-500">{request.specialty ?? 'Medical care'}</p></div></div>
                  <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><MapPin size={17} /></div><div className="min-w-0"><p className="text-xs text-slate-500">Location</p><p className="mt-1 truncate text-sm font-medium">{request.branch_name ?? 'CarePlus Medical Centre'}</p></div></div>
                  <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><HeartPulse size={17} /></div><div><p className="text-xs text-slate-500">Visit</p><p className="mt-1 text-sm font-medium">{formatDate(request.appointment_date)}</p><p className="text-xs text-slate-500">{request.appointment_type}</p></div></div>
                </div>
              </section>

              <FeedbackForm token={token} />

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">Please do not include sensitive medical information in your comments. Your feedback is handled by CarePlus staff.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
