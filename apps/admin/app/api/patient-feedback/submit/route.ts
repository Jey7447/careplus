import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

function rating(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const overall = rating(body.overall_rating);

    if (!token || !overall) {
      return NextResponse.json({ error: 'A valid feedback link and overall rating are required.' }, { status: 400 });
    }

    const comments = typeof body.comments === 'string' ? body.comments.trim() : '';
    if (comments.length > 2000) {
      return NextResponse.json({ error: 'Comments must be 2000 characters or fewer.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('submit_patient_feedback', {
      p_token: token,
      p_overall_rating: overall,
      p_doctor_rating: rating(body.doctor_rating),
      p_facility_rating: rating(body.facility_rating),
      p_waiting_time_rating: rating(body.waiting_time_rating),
      p_comments: comments || null,
      p_feedback_category: typeof body.feedback_category === 'string' ? body.feedback_category.trim().slice(0, 100) || null : null,
    });

    if (error) {
      const message = error.message || 'We could not submit your feedback.';
      const status = message.includes('already been used') || message.includes('expired') ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ success: true, feedback_id: data });
  } catch {
    return NextResponse.json({ error: 'We could not process your feedback. Please try again.' }, { status: 400 });
  }
}
