import { createClient } from './supabase/server';

export type ReportStats = {
  appointments: {
    total: number;
    today: number;
    byStatus: { status: string; count: number }[];
  };
  notifications: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    locked: number;
    staleLocks: number;
    byChannel: { channel: string; count: number }[];
    recentFailures: {
      notification_id: number;
      appointment_id: number | null;
      recipient: string | null;
      channel: string | null;
      notification_type: string | null;
      dispatch_last_error: string | null;
    }[];
  };
  feedback: {
    total: number;
    normal: number;
    followUp: number;
    critical: number;
    needsAttention: number;
  };
};

export async function getReportStats(): Promise<ReportStats> {
  const supabase = await createClient();
  const todayDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [
    appointments,
    appointmentsToday,
    appointmentStatuses,
    notifications,
    notificationStatuses,
    notificationChannels,
    lockedNotifications,
    staleLocks,
    recentFailures,
    feedback,
    feedbackTriage,
  ] = await Promise.all([
    supabase.from('appointments').select('appointment_id', { count: 'exact', head: true }),
    supabase.from('appointments').select('appointment_id', { count: 'exact', head: true }).eq('appointment_date', todayDate),
    supabase.from('appointments').select('appointment_status'),
    supabase.from('notifications').select('notification_id', { count: 'exact', head: true }),
    supabase.from('notifications').select('status'),
    supabase.from('notifications').select('channel'),
    supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('status', 'Pending').not('dispatch_locked_at', 'is', null),
    supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('status', 'Pending').not('dispatch_locked_at', 'is', null).lt('dispatch_locked_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()),
    supabase
      .from('notifications')
      .select('notification_id, appointment_id, recipient, channel, notification_type, dispatch_last_error')
      .eq('status', 'Failed')
      .order('notification_id', { ascending: false })
      .limit(8),
    supabase.from('patient_feedback').select('feedback_id', { count: 'exact', head: true }),
    supabase.from('patient_feedback').select('triage_status'),
  ]);

  const firstError = [
    appointments.error,
    appointmentsToday.error,
    appointmentStatuses.error,
    notifications.error,
    notificationStatuses.error,
    notificationChannels.error,
    lockedNotifications.error,
    staleLocks.error,
    recentFailures.error,
    feedback.error,
    feedbackTriage.error,
  ].find(Boolean);

  if (firstError) throw firstError;

  const statusCounts = new Map<string, number>();
  for (const row of appointmentStatuses.data ?? []) {
    const status = row.appointment_status ?? 'Unknown';
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  const notificationStatusCounts = new Map<string, number>();
  for (const row of notificationStatuses.data ?? []) {
    const status = row.status ?? 'Unknown';
    notificationStatusCounts.set(status, (notificationStatusCounts.get(status) ?? 0) + 1);
  }

  const channelCounts = new Map<string, number>();
  for (const row of notificationChannels.data ?? []) {
    const channel = row.channel ?? 'Unknown';
    channelCounts.set(channel, (channelCounts.get(channel) ?? 0) + 1);
  }

  const triageCounts = new Map<string, number>();
  for (const row of feedbackTriage.data ?? []) {
    const status = row.triage_status ?? 'untriaged';
    triageCounts.set(status, (triageCounts.get(status) ?? 0) + 1);
  }

  return {
    appointments: {
      total: appointments.count ?? 0,
      today: appointmentsToday.count ?? 0,
      byStatus: [...statusCounts.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    },
    notifications: {
      total: notifications.count ?? 0,
      pending: notificationStatusCounts.get('Pending') ?? 0,
      sent: notificationStatusCounts.get('Sent') ?? 0,
      delivered: notificationStatusCounts.get('Delivered') ?? 0,
      failed: notificationStatusCounts.get('Failed') ?? 0,
      locked: lockedNotifications.count ?? 0,
      staleLocks: staleLocks.count ?? 0,
      byChannel: [...channelCounts.entries()]
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count),
      recentFailures: (recentFailures.data ?? []).map((row) => ({
        notification_id: row.notification_id,
        appointment_id: row.appointment_id,
        recipient: row.recipient,
        channel: row.channel,
        notification_type: row.notification_type,
        dispatch_last_error: row.dispatch_last_error,
      })),
    },
    feedback: {
      total: feedback.count ?? 0,
      normal: triageCounts.get('normal') ?? 0,
      followUp: triageCounts.get('follow_up') ?? 0,
      critical: triageCounts.get('critical') ?? 0,
      needsAttention: (triageCounts.get('follow_up') ?? 0) + (triageCounts.get('critical') ?? 0),
    },
  };
}
