import { CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Mail, Phone, Settings, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const navigation = [
  ['Dashboard', '/', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Settings', '#', Settings],
] as const;

type SearchParams = Promise<{ search?: string }>;

export const dynamic = 'force-dynamic';

function formatDate(date: string | null) {
  if (!date) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(`${date}T12:00:00+01:00`));
}

function formatCreatedAt(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

export default async function PatientsPage({ searchParams }: { searchParams: SearchParams }) {
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

  const params = await searchParams;
  const search = (params.search ?? '').trim().toLowerCase();

  const { data: patients, error } = await supabase
    .from('patients')
    .select('patient_id, first_name, last_name, phone_number, email, date_of_birth, gender, address, created_at')
    .order('patient_id', { ascending: true })
    .limit(100);

  const rows = patients ?? [];
  const filteredRows = search
    ? rows.filter((patient) =>
        `${patient.first_name} ${patient.last_name} ${patient.phone_number ?? ''} ${patient.email ?? ''} ${patient.gender ?? ''} ${patient.address ?? ''}`
          .toLowerCase()
          .includes(search),
      )
    : rows;

  const withPhone = rows.filter((patient) => Boolean(patient.phone_number)).length;
  const withEmail = rows.filter((patient) => Boolean(patient.email)).length;
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
            {navigation.map(([label, href, Icon]) => href === '#' ? (
              <div key={label} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400"><Icon size={18} />{label}</div>
            ) : (
              <Link key={label} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${label === 'Patients' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}>
                <Icon size={18} />{label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[var(--border)] p-5 text-xs text-slate-500">CarePlus Administration</div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
              <div>
                <p className="text-sm text-slate-500">CarePlus Medical Centre</p>
                <h1 className="mt-1 text-2xl font-semibold">Patients</h1>
                <p className="mt-1 text-sm text-slate-500">Review registered patient records and contact information.</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{email}</p>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-slate-500">Total patients</p><p className="mt-3 text-3xl font-semibold">{rows.length}</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-slate-500">With phone</p><p className="mt-3 text-3xl font-semibold">{withPhone}</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-sm text-slate-500">With email</p><p className="mt-3 text-3xl font-semibold">{withEmail}</p></div>
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <form className="grid gap-4 lg:grid-cols-[1fr_auto]" method="get">
                <label>
                  <span className="text-sm font-medium text-slate-700">Search patients</span>
                  <input name="search" defaultValue={params.search ?? ''} placeholder="Name, phone, email, gender or address" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" />
                </label>
                <button type="submit" className="self-end rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Search</button>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="font-semibold">Patient records</h2>
                  <p className="mt-1 text-sm text-slate-500">Showing {filteredRows.length} of up to 100 loaded patients.</p>
                </div>
                {error && <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">Unable to load patients</span>}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Patient</th>
                      <th className="px-6 py-3 font-medium">Contact</th>
                      <th className="px-6 py-3 font-medium">Date of birth</th>
                      <th className="px-6 py-3 font-medium">Gender</th>
                      <th className="px-6 py-3 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((patient) => (
                      <tr key={patient.patient_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"><Users size={16} /></div>
                            <div>
                              <p className="font-medium text-slate-900">{patient.first_name} {patient.last_name}</p>
                              <p className="mt-1 text-xs text-slate-500">Patient #{patient.patient_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="flex items-center gap-2 text-sm text-slate-700"><Phone size={14} />{patient.phone_number ?? 'Not recorded'}</p>
                          <p className="mt-1 flex items-center gap-2 break-all text-xs text-slate-500"><Mail size={14} />{patient.email ?? 'Not recorded'}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-700">{formatDate(patient.date_of_birth)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-700">{patient.gender ?? 'Not recorded'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatCreatedAt(patient.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRows.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No patients match the current search.</div>}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
