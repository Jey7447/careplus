'use client';

import { CheckCircle2, ChevronRight, MessageSquareText, Star } from 'lucide-react';
import { FormEvent, useState } from 'react';

const ratingQuestions = [
  { key: 'doctor_rating', label: 'How was your care provider?' },
  { key: 'facility_rating', label: 'How was the CarePlus facility?' },
  { key: 'waiting_time_rating', label: 'How was your waiting time?' },
] as const;

type RatingKey = (typeof ratingQuestions)[number]['key'];

function Rating({ value, onChange, label }: { value: number | null; onChange: (value: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} out of 5`}
          onClick={() => onChange(rating)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-300 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 aria-checked:border-slate-950 aria-checked:bg-slate-950 aria-checked:text-white"
        >
          <Star size={17} className={value !== null && rating <= value ? 'fill-current' : ''} />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackForm({ token }: { token: string }) {
  const [overall, setOverall] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<RatingKey, number | null>>({
    doctor_rating: null,
    facility_rating: null,
    waiting_time_rating: null,
  });
  const [category, setCategory] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function updateRating(key: RatingKey, value: number) {
    setRatings((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!overall) {
      setError('Please select an overall rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/patient-feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          overall_rating: overall,
          doctor_rating: ratings.doctor_rating,
          facility_rating: ratings.facility_rating,
          waiting_time_rating: ratings.waiting_time_rating,
          comments,
          feedback_category: category,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not submit your feedback.');
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not submit your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 text-white">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">Thank you for your feedback</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Your response has been securely recorded. Your feedback helps CarePlus improve the patient experience.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><Star size={18} className="fill-current" /></div>
          <div><h2 className="font-semibold">Overall experience</h2><p className="mt-1 text-sm text-slate-500">How would you rate your overall experience?</p></div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Rating value={overall} onChange={setOverall} label="Overall experience" />
          <span className="text-xs font-medium text-slate-400">1 = Poor · 5 = Excellent</span>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><ChevronRight size={19} /></div>
          <div><h2 className="font-semibold">A little more detail</h2><p className="mt-1 text-sm text-slate-500">These questions are optional.</p></div>
        </div>
        <div className="mt-6 space-y-6">
          {ratingQuestions.map((question) => (
            <div key={question.key} className="flex flex-col gap-3 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-800">{question.label}</p>
              <Rating value={ratings[question.key]} onChange={(value) => updateRating(question.key, value)} label={question.label} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><MessageSquareText size={18} /></div>
          <div><h2 className="font-semibold">Tell us more</h2><p className="mt-1 text-sm text-slate-500">Optional, but your comments can help us understand your experience.</p></div>
        </div>
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="category" className="text-sm font-medium text-slate-800">What would you like to comment on?</label>
            <select id="category" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100">
              <option value="">Select a category (optional)</option>
              <option value="Care provider">Care provider</option>
              <option value="Facility">Facility</option>
              <option value="Waiting time">Waiting time</option>
              <option value="Communication">Communication</option>
              <option value="Appointment process">Appointment process</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="comments" className="text-sm font-medium text-slate-800">Your comments</label>
            <textarea id="comments" value={comments} onChange={(event) => setComments(event.target.value)} maxLength={2000} rows={5} placeholder="What did we do well? What could we improve?" className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" />
            <div className="mt-1 text-right text-xs text-slate-400">{comments.length}/2000</div>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <button type="submit" disabled={submitting} className="h-12 w-full rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? 'Submitting feedback…' : 'Submit feedback'}
      </button>
    </form>
  );
}
