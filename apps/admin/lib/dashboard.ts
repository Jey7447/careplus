import { createSupabaseBrowserClient } from './supabase';

export async function getDashboardStats() {
  const supabase = createSupabaseBrowserClient();

  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const [appointments, patients, doctors, notifications] = await Promise.all([
    supabase.from('appointments').select('appointment_id', { count: 'exact', head: true }).gte('appointment_date', start.toISOString().slice(0, 10)).lte('appointment_date', end.toISOString().slice(0, 10)),
    supabase.from('patients').select('patient_id', { count: 'exact', head: true }),
    supabase.from('doctors').select('doctor_id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('status', 'Pending'),
  ]);

  const error = appointments.error || patients.error || doctors.error || notifications.error;
  if (error) throw error;

  return {
    todayAppointments: appointments.count ?? 0,
    totalPatients: patients.count ?? 0,
    activeDoctors: doctors.count ?? 0,
    pendingNotifications: notifications.count ?? 0,
  };
}
