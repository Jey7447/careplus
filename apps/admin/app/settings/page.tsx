import { BarChart3, Bell, CalendarDays, CheckCircle2, HeartPulse, LayoutDashboard, Link2, LockKeyhole, Settings as SettingsIcon, ShieldCheck, Stethoscope, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import DoctorLinkForm from './doctor-link-form';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', LayoutDashboard], ['Appointments', '/appointments', CalendarDays], ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope], ['Notifications', '/notifications', Bell], ['Feedback', '/feedback', BarChart3], ['Settings', '/settings', SettingsIcon],
] as const;

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase.from('careplus_staff_users')
    .select('id, role, active').eq('auth_user_id', claimsData.claims.sub).eq('active', true).eq('role', 'admin').maybeSingle();
  if (staffError || !staffRecord) redirect('/unauthorized');

  const [{ data: doctors }, { data: staffUsers }] = await Promise.all([
    supabase.from('doctors').select('doctor_id, first_name, last_name, specialty, active').eq('active', true).order('last_name'),
    supabase.from('careplus_staff_users').select('id, auth_user_id, role, active, doctor_id').order('id'),
  ]);

  const linkedDoctorIds = new Set((staffUsers ?? []).map((s) => s.doctor_id).filter(Boolean));
  const email = typeof claimsData.claims.email === 'string' ? claimsData.claims.email : 'Authenticated staff';

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><HeartPulse size={22} /></div><div><b>CarePlus</b><p className="text-xs text-slate-500">Medical Centre</p></div></div>
          <nav className="flex-1 px-3">{navigation.map(([label, href, Icon]) => <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${label === 'Settings' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}><Icon size={18} />{label}</Link>)}</nav>
          <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>
        <section className="flex-1">
          <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8"><div className="mx-auto max-w-7xl flex items-center justify-between gap-6"><div><p className="text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="mt-1 text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-slate-500">Administration, security and staff access.</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium">{email}</p></div></div></header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Link2 size={19} /></div><div><h2 className="font-semibold">Doctor account linking</h2><p className="mt-1 text-sm text-slate-500">Connect an authenticated CarePlus staff account to an existing doctor record. Account creation itself remains in Supabase Auth; this screen manages the CarePlus identity link.</p></div></div>
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Security rule:</strong> a doctor must have their own authenticated account. Do not share the administrator account or change its role to doctor.</div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {(doctors ?? []).map((doctor) => {
                  const linked = linkedDoctorIds.has(doctor.doctor_id);
                  return <div key={doctor.doctor_id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4"><div><p className="font-medium">Dr. {doctor.first_name} {doctor.last_name}</p><p className="mt-1 text-sm text-slate-500">{doctor.specialty ?? 'Specialty not recorded'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${linked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{linked ? 'Linked' : 'Awaiting account'}</span></div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">{linked ? <><CheckCircle2 size={14} className="text-emerald-600" /> Doctor identity linked</> : <><UserPlus size={14} /> Create/authenticate account, then link it</>}</div>
                    {!linked && <DoctorLinkForm doctorId={doctor.doctor_id} />}
                  </div>;
                })}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ShieldCheck size={19} /></div><div><h2 className="font-semibold">Administration & access</h2><p className="text-sm text-slate-500">Current administrator account and access state.</p></div></div><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-600">Signed-in account</span><span className="font-medium">{email}</span></div><div className="flex justify-between gap-4"><span className="text-slate-600">Role</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">Administrator</span></div><div className="flex justify-between gap-4"><span className="text-slate-600">Account status</span><span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={15}/>Active</span></div></div></section>
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><LockKeyhole size={19} /></div><div><h2 className="font-semibold">Security</h2><p className="text-sm text-slate-500">Controls protecting the administration portal.</p></div></div><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><span className="text-slate-600">Authentication</span><span className="font-medium text-emerald-700">Supabase Auth</span></div><div className="flex justify-between"><span className="text-slate-600">Admin authorization</span><span className="font-medium text-emerald-700">Enabled</span></div><div className="flex justify-between"><span className="text-slate-600">Row-level security</span><span className="font-medium text-emerald-700">Enabled</span></div></div></section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
