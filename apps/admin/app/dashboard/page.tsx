import { CalendarDays, ClipboardList, HeartPulse, Stethoscope, Users } from 'lucide-react';
import { getDashboardStats } from '../../lib/dashboard';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const cards = [
    ['Today\'s Appointments', stats.todayAppointments, CalendarDays],
    ['Total Patients', stats.totalPatients, Users],
    ['Active Doctors', stats.activeDoctors, Stethoscope],
    ['Pending Notifications', stats.pendingNotifications, ClipboardList],
  ] as const;

  return (
    <main className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm text-slate-500">CarePlus Medical Centre</p>
          <h1 className="mt-1 text-2xl font-semibold">Live Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Connected to the CarePlus Supabase database.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, Icon]) => (
            <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <div className="flex justify-between text-sm text-slate-500"><span>{label}</span><Icon size={19} /></div>
              <p className="mt-4 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <div className="flex items-center gap-3"><HeartPulse size={20} /><h2 className="font-semibold">Database connection</h2></div>
          <p className="mt-2 text-sm text-slate-500">The dashboard is now reading live counts from Supabase. Appointment management is the next module.</p>
        </section>
      </div>
    </main>
  );
}
