import { ArrowLeft, HeartPulse, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function DoctorDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const doctorId = Number(id);
  if (!Number.isInteger(doctorId) || doctorId < 1) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staff } = await supabase.from('careplus_staff_users').select('id').eq('auth_user_id', claimsData.claims.sub).eq('active', true).eq('role', 'admin').maybeSingle();
  if (!staff) redirect('/unauthorized');

  const { data: doctor } = await supabase.from('doctors').select('doctor_id, first_name, last_name, specialty, phone, email, active, branch_id').eq('doctor_id', doctorId).maybeSingle();
  if (!doctor) notFound();

  const { data: branch } = doctor.branch_id ? await supabase.from('branches').select('*').eq('branch_id', doctor.branch_id).maybeSingle() : { data: null };
  const branchRecord = branch as Record<string, unknown> | null;
  const branchName = branchRecord ? String(branchRecord.name ?? branchRecord.branch_name ?? 'CarePlus branch') : 'Not recorded';

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/doctors" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} />Back to doctors</Link>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 lg:p-8">
          <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white"><HeartPulse size={26} /></div><div><p className="text-sm text-slate-500">CarePlus Medical Centre</p><h1 className="text-2xl font-semibold">Dr. {doctor.first_name} {doctor.last_name}</h1><p className="text-sm text-slate-500">Doctor #{doctor.doctor_id}</p></div></div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div><p className="text-xs text-slate-500">Specialty</p><p className="mt-1 font-medium">{doctor.specialty ?? 'Not recorded'}</p></div>
            <div><p className="text-xs text-slate-500">Branch</p><p className="mt-1 font-medium">{branchName}</p></div>
            <div><p className="text-xs text-slate-500">Phone</p><p className="mt-1 font-medium">{doctor.phone ?? 'Not recorded'}</p></div>
            <div><p className="text-xs text-slate-500">Email</p><p className="mt-1 break-all font-medium">{doctor.email ?? 'Not recorded'}</p></div>
            <div><p className="text-xs text-slate-500">Status</p><p className="mt-1 font-medium">{doctor.active ? 'Active' : 'Inactive'}</p></div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-6"><p className="flex items-center gap-2 text-sm text-slate-600"><Stethoscope size={17} />Doctor profile</p><p className="mt-2 text-sm text-slate-500">Detailed appointment history and workload views can be added here.</p></div>
        </section>
      </div>
    </main>
  );
}
