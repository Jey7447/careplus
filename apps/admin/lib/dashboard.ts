import { createClient } from './supabase/server';

export type UpcomingAppointment = {
  appointment_id: number;
  appointment_date: string;
  appointment_time: string;
  appointment_status: string;
  patient_name: string;
  doctor_name: string;
};

export type FeedbackAttention = {
  feedback_id: number;
  appointment_id: number | null;
  patient_id: number;
  overall_rating: number;
  comments: string | null;
  feedback_category: string | null;
  follow_up_status: string;
  submitted_at: string;
};

export async function getDashboardStats() {
  const supabase = await createClient();

  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);

  const [appointments, patients, doctors, notifications, upcoming, feedbackAttention, feedbackCritical, feedbackFollowUp] = await Promise.all([
    supabase.from('appointments').select('appointment_id', { count: 'exact', head: true }).eq('appointment_date', todayDate),
    supabase.from('patients').select('patient_id', { count: 'exact', head: true }),
    supabase.from('doctors').select('doctor_id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase
      .from('appointments')
      .select('appointment_id, appointment_date, appointment_time, appointment_status, patient_id, doctor_id')
      .in('appointment_status', ['Scheduled', 'Confirmed'])
      .or(`appointment_date.gt.${todayDate},and(appointment_date.eq.${todayDate},appointment_time.gte.${today.toISOString().slice(11, 19)})`)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(5),
    supabase
      .from('patient_feedback')
      .select('feedback_id, appointment_id, patient_id, overall_rating, comments, feedback_category, follow_up_status, submitted_at')
      .in('follow_up_status', ['Follow-up Required', 'Critical'])
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase.from('patient_feedback').select('feedback_id', { count: 'exact', head: true }).eq('follow_up_status', 'Critical'),
    supabase.from('patient_feedback').select('feedback_id', { count: 'exact', head: true }).eq('follow_up_status', 'Follow-up Required'),
  ]);

  const error = appointments.error || patients.error || doctors.error || notifications.error || upcoming.error || feedbackAttention.error || feedbackCritical.error || feedbackFollowUp.error;
  if (error) throw error;

  const upcomingRows = upcoming.data ?? [];
  const patientIds = [...new Set(upcomingRows.map((row) => row.patient_id))];
  const doctorIds = [...new Set(upcomingRows.map((row) => row.doctor_id))];

  const [{ data: patientRows, error: patientLookupError }, { data: doctorRows, error: doctorLookupError }] = await Promise.all([
    patientIds.length
      ? supabase.from('patients').select('patient_id, first_name, last_name').in('patient_id', patientIds)
      : Promise.resolve({ data: [], error: null }),
    doctorIds.length
      ? supabase.from('doctors').select('doctor_id, first_name, last_name').in('doctor_id', doctorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (patientLookupError || doctorLookupError) throw patientLookupError || doctorLookupError;

  const patientMap = new Map((patientRows ?? []).map((patient) => [patient.patient_id, `${patient.first_name} ${patient.last_name}`]));
  const doctorMap = new Map((doctorRows ?? []).map((doctor) => [doctor.doctor_id, `Dr. ${doctor.first_name} ${doctor.last_name}`]));

  const upcomingAppointments: UpcomingAppointment[] = upcomingRows.map((row) => ({
    appointment_id: row.appointment_id,
    appointment_date: row.appointment_date,
    appointment_time: row.appointment_time,
    appointment_status: row.appointment_status,
    patient_name: patientMap.get(row.patient_id) ?? 'Unknown patient',
    doctor_name: doctorMap.get(row.doctor_id) ?? 'Unknown doctor',
  }));

  return {
    todayAppointments: appointments.count ?? 0,
    totalPatients: patients.count ?? 0,
    activeDoctors: doctors.count ?? 0,
    pendingNotifications: notifications.count ?? 0,
    feedbackCritical: feedbackCritical.count ?? 0,
    feedbackFollowUp: feedbackFollowUp.count ?? 0,
    feedbackAttention: (feedbackAttention.data ?? []) as FeedbackAttention[],
    upcomingAppointments,
  };
}
