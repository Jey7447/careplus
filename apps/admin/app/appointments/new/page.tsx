import { ArrowLeft, CalendarPlus, HeartPulse, Settings, Stethoscope, Users, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppointmentForm from './appointment-form';
import { createClient } from '../../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', HeartPulse],
  ['Appointments', '/appointments', CalendarPlus],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Settings', '/settings', Settings],
] as const;

export const dynamic = 'force-dynamic';

export default async function NewAppointmentPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();

  if (!staffRecord) redirect('/unauthorized');

  const [{ data: doctors }, { data: branches }] = await Promise.all([
    supabase
      .from('doctors')
      .select('doctor_id, first_name, last_name, specialty, branch_id')
      .eq('active', true)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    supabase
      .from('branches')
      .select('branch_id, branch_name, city')
      .eq('active', true)
      .order('branch_name', { ascending: true }),
  ]);

  const branchMap = new Map((branches ?? []).map((branch) => [
    branch.branch_id,
    `${branch.branch_name}${branch.city ? ` · ${branch.city}` : ''}`,
  ]));

  const doctorOptions = (doctors ?? []).map((doctor) => ({
    doctor_id: doctor.doctor_id,
    first_name: doctor.first_name,
    last_name: doctor.last_name,
    specialty: doctor.specialty,
    branch_id: doctor.branch_id,
    branch_name: branchMap.get(doctor.branch_id) ?? 'Assigned branch',
  }));

  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/10"><HeartPulse size={22} /></div>
            <div><b className="text-sm text-slate-950">CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div>
          </div>
          <nav className="flex-1 px-3">
            {navigation.map(([label, href, Icon]) => (
              <Link key={label} href={href} className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${label === 'Appointments' ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>
                <Icon size={18} /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
              <div>
                <Link href="/appointments" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16} /> Back to appointments</Link>
                <p className="mt-4 text-sm text-slate-500">CarePlus Medical Centre</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-950">New appointment</h1>
                <p className="mt-1 text-sm text-slate-500">Book an appointment for an existing patient or register a new patient.</p>
              </div>
              <div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-800">{email}</p></div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><CalendarPlus size={19} /></div>
                <div><h2 className="font-semibold text-slate-950">Create appointment</h2><p className="text-sm text-slate-500">The appointment will start with Scheduled status.</p></div>
              </div>
            </section>

            <AppointmentForm doctors={doctorOptions} />
          </div>
        </section>
      </div>
    </main>
  );
}
