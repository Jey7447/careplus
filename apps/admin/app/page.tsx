import { CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Settings, Stethoscope, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';

const stats = [
  ['Today\'s Appointments', CalendarDays],
  ['Total Patients', Users],
  ['Active Doctors', Stethoscope],
  ['Pending Notifications', ClipboardList],
] as const;

const navigation = [
  ['Dashboard', LayoutDashboard, true],
  ['Appointments', CalendarDays, false],
  ['Patients', Users, false],
  ['Doctors', Stethoscope, false],
  ['Notifications', ClipboardList, false],
  ['Settings', Settings, false],
] as const;

export default async function Home() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect('/login');
  }

  const { data: staffRecord, error: staffError } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (staffError || !staffRecord) {
    redirect('/unauthorized');
  }

  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div>
            <div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, Icon, active]) => (
              <div key={label} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}>
                <Icon size={18} />{label}
              </div>
            ))}
          </nav>
          <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
              <div>
                <p className="text-sm text-slate-500">CarePlus Medical Centre</p>
                <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">Overview of centre activity.</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{email}</p>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
              Authentication and CarePlus administrator authorization are active. Database modules will be connected next.
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(([label, Icon]) => (
                <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-5">
                  <div className="flex justify-between text-sm text-slate-500"><span>{label}</span><Icon size={19} /></div>
                  <p className="mt-4 text-3xl font-semibold">—</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="font-semibold">Upcoming appointments</h2>
                <p className="mt-1 text-sm text-slate-500">Supabase appointment data will be connected next.</p>
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No data connected yet.</div>
              </section>
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="font-semibold">System status</h2>
                <div className="mt-5 space-y-4 text-sm">
                  {['Supabase database', 'Appointment automation', 'Notification tracking'].map((item) => (
                    <div key={item} className="flex justify-between"><span className="text-slate-600">{item}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Pending</span></div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
