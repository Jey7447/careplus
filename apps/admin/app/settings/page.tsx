import { BarChart3, Bell, CalendarDays, CheckCircle2, HeartPulse, LayoutDashboard, LockKeyhole, Settings as SettingsIcon, ShieldCheck, Stethoscope, Users, Wrench } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', Bell],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', SettingsIcon],
] as const;

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staffRecord, error: staffError } = await supabase
    .from('careplus_staff_users')
    .select('id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'admin')
    .maybeSingle();
  if (staffError || !staffRecord) redirect('/unauthorized');

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
          <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-6"><div><p className="text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="mt-1 text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-slate-500">Administration, security and system configuration.</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="mt-1 text-sm font-medium text-slate-800">{email}</p></div></div></header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">Settings are currently presented as a protected administration overview. Editable configuration will be introduced only where it can be safely validated and audited.</div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ShieldCheck size={19} /></div><div><h2 className="font-semibold">Administration & access</h2><p className="text-sm text-slate-500">Current administrator account and access state.</p></div></div>
                <div className="mt-6 space-y-4 text-sm"><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Signed-in account</span><span className="font-medium text-slate-800">{email}</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Role</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Administrator</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Account status</span><span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={15} />Active</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Database access</span><span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={15} />Protected</span></div></div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><LockKeyhole size={19} /></div><div><h2 className="font-semibold">Security</h2><p className="text-sm text-slate-500">Controls protecting the administration portal.</p></div></div>
                <div className="mt-6 space-y-4 text-sm"><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Authentication</span><span className="font-medium text-emerald-700">Supabase Auth</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Admin authorization</span><span className="font-medium text-emerald-700">Enabled</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Row-level security</span><span className="font-medium text-emerald-700">Enabled</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Protected database policies</span><span className="font-medium text-emerald-700">Active</span></div></div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Bell size={19} /></div><div><h2 className="font-semibold">Notifications & automation</h2><p className="text-sm text-slate-500">Messaging and workflow configuration.</p></div></div>
                <div className="mt-6 space-y-4 text-sm"><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Notification tracking</span><span className="font-medium text-emerald-700">Active</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">24-hour appointment reminders</span><span className="font-medium text-slate-700">Configured</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Patient response workflow</span><span className="font-medium text-slate-700">Configured</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Outbound messaging</span><span className="font-medium text-amber-700">Credential-controlled</span></div></div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Wrench size={19} /></div><div><h2 className="font-semibold">System configuration</h2><p className="text-sm text-slate-500">Core CarePlus environment information.</p></div></div>
                <div className="mt-6 space-y-4 text-sm"><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Application</span><span className="font-medium text-slate-800">CarePlus Administration</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Database</span><span className="font-medium text-slate-800">Supabase / PostgreSQL</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Timezone</span><span className="font-medium text-slate-800">Africa/Lagos</span></div><div className="flex items-center justify-between gap-4"><span className="text-slate-600">Environment</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Administration</span></div></div>
              </section>
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><SettingsIcon size={19} /></div><div><h2 className="font-semibold">Planned controls</h2><p className="text-sm text-slate-500">Settings we can add as the administration portal matures.</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="rounded-xl border border-slate-200 p-4"><p className="font-medium">Staff management</p><p className="mt-1 text-sm text-slate-500">Add, deactivate and assign roles to authorized CarePlus staff.</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="font-medium">Notification preferences</p><p className="mt-1 text-sm text-slate-500">Control approved notification channels and event types.</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="font-medium">Automation controls</p><p className="mt-1 text-sm text-slate-500">Review and safely enable or pause supported automations.</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="font-medium">Audit & activity</p><p className="mt-1 text-sm text-slate-500">Review administrative changes and important system events.</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="font-medium">Centre configuration</p><p className="mt-1 text-sm text-slate-500">Manage branches and operational defaults.</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="font-medium">Integration health</p><p className="mt-1 text-sm text-slate-500">Show connection health without exposing credentials or secrets.</p></div></div></section>
          </div>
        </section>
      </div>
    </main>
  );
}
