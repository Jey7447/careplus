import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

const ALLOWED_STATUSES = ['New', 'Reviewed', 'Follow-up Required', 'Resolved'] as const;
type FeedbackStatus = (typeof ALLOWED_STATUSES)[number];

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_TRANSITIONS: Record<FeedbackStatus, readonly FeedbackStatus[]> = {
  New: ['Reviewed', 'Follow-up Required'],
  Reviewed: ['New', 'Follow-up Required', 'Resolved'],
  'Follow-up Required': ['Reviewed', 'Resolved'],
  Resolved: ['Reviewed', 'Follow-up Required'],
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError) {
      console.error('Feedback status auth error:', claimsError);
      return NextResponse.json({ error: 'Unable to verify the current session.' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: staffRecord, error: staffError } = await supabase
      .from('careplus_staff_users')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('active', true)
      .eq('role', 'admin')
      .maybeSingle();

    if (staffError) {
      console.error('Feedback status staff lookup error:', staffError);
      return NextResponse.json({ error: 'Unable to verify administrator access.' }, { status: 500 });
    }

    if (!staffRecord) {
      return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    }

    const { id } = await params;
    const feedbackId = Number(id);
    if (!Number.isSafeInteger(feedbackId) || feedbackId < 1) {
      return NextResponse.json({ error: 'Invalid feedback ID.' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const requestedStatus =
      typeof body === 'object' && body !== null && 'status' in body
        ? (body as { status?: unknown }).status
        : undefined;

    if (!ALLOWED_STATUSES.includes(requestedStatus as FeedbackStatus)) {
      return NextResponse.json({ error: 'Invalid feedback status.' }, { status: 400 });
    }

    const { data: currentFeedback, error: currentError } = await supabase
      .from('patient_feedback')
      .select('feedback_id, follow_up_status')
      .eq('feedback_id', feedbackId)
      .maybeSingle();

    if (currentError) {
      console.error('Feedback status lookup error:', currentError);
      return NextResponse.json({ error: 'Unable to load the feedback record.' }, { status: 500 });
    }

    if (!currentFeedback) {
      return NextResponse.json({ error: 'Feedback record not found.' }, { status: 404 });
    }

    const currentStatus = currentFeedback.follow_up_status as FeedbackStatus;

    if (!ALLOWED_STATUSES.includes(currentStatus)) {
      return NextResponse.json({ error: 'The feedback record has an invalid current status.' }, { status: 409 });
    }

    if (currentStatus === requestedStatus) {
      return NextResponse.json({
        feedback_id: feedbackId,
        follow_up_status: currentStatus,
        updated_at: null,
      });
    }

    if (!ALLOWED_TRANSITIONS[currentStatus].includes(requestedStatus as FeedbackStatus)) {
      return NextResponse.json(
        { error: `Feedback cannot move directly from ${currentStatus} to ${requestedStatus}.` },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from('patient_feedback')
      .update({
        follow_up_status: requestedStatus as FeedbackStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('feedback_id', feedbackId)
      .eq('follow_up_status', currentStatus)
      .select('feedback_id, follow_up_status, updated_at')
      .maybeSingle();

    if (error) {
      console.error('Feedback status update error:', error);
      return NextResponse.json(
        { error: error.message || 'The database rejected the feedback status update.' },
        { status: 409 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'The feedback status changed before this update could be saved. Refresh and try again.' },
        { status: 409 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected feedback status API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error while updating feedback status.' },
      { status: 500 },
    );
  }
}
