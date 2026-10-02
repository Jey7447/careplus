import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Pill,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

function formatDateTime(value: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

export default async function ClinicalEncounterPage({ params }: { params: Params }) {
  const { id } = await params;
  const encounterId = Number(id);
  if (!Number.isInteger(encounterId) || encounterId < 1) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: staff } = await supabase
    .from('careplus_staff_users')
    .select('id, doctor_id, role, active')
    .eq('auth_user_id', claimsData.claims.sub)
    .eq('active', true)
    .eq('role', 'doctor')
    .maybeSingle();

  if (!staff?.doctor_id) redirect('/unauthorized');

  const { data: encounter, error } = await supabase
    .from('encounters')
    .select('encounter_id, appointment_id, patient_id, doctor_id, branch_id, encounter_type, status, chief_complaint, clinical_summary, assessment, plan, started_at, completed_at, signed_at')
    .eq('encounter_id', encounterId)
    .eq('doctor_id', staff.doctor_id)
    .maybeSingle();

  if (error || !encounter) notFound();

  const [
    { data: patient },
    { data: vitals },
    { data: diagnoses },
    { data: allergies },
  ] = await Promise.all([
    supabase.from('patients').select('patient_id, first_name, last_name, date_of_birth, gender, phone_number').eq('patient_id', encounter.patient_id).maybeSingle(),
    supabase.from('encounter_vitals').select('vital_id, recorded_at, systolic_bp, diastolic_bp, pulse_rate, temperature_c, respiratory_rate, spo2_percent, weight_kg, height_cm, bmi, pain_score, notes').eq('encounter_id', encounterId).order('recorded_at', { ascending: false }).limit(10),
    supabase.from('encounter_diagnoses').select('encounter_diagnosis_id, diagnosis_text, severity, is_primary, diagnosed_at, notes').eq('encounter_id', encounterId).order('diagnosed_at', { ascending: false }),
    supabase.from('patient_allergies').select('allergy_id, allergen, allergy_type, reaction, severity, status, notes').eq('patient_id', encounter.patient_id).order('status').order('created_at', { ascending: false }),
  ]);

  if (!patient) notFound();

  const activeAllergies = (allergies ?? []).filter((a) => a.status === 'Active');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
          <Link href="/doctor-dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to doctor dashboard</Link>
          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10"><UserRound size={26} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clinical encounter #{encounter.encounter_id}</p>
                <h1 className="mt-1 text-2xl font-semibold"> {patient.first_name} {patient.last_name}</h1>
                <p className="mt-1 text-sm text-slate-400">{patient.gender ?? 'Gender not recorded'} · Encounter status: {encounter.status}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">{encounter.encounter_type}</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">{encounter.status}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {activeAllergies.length > 0 && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
              <div><p className="font-semibold text-red-900">Active allergies</p><div className="mt-2 flex flex-wrap gap-2">{activeAllergies.map((a) => <span key={a.allergy_id} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs text-red-800">{a.allergen}{a.reaction ? ` · ${a.reaction}` : ''}</span>)}</div></div>
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Stethoscope size={18} /></div><div><h2 className="font-semibold">Clinical assessment</h2><p className="text-sm text-slate-500">The structured clinical note for this encounter.</p></div></div>
              <div className="mt-6 space-y-5">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chief complaint</p><div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6">{encounter.chief_complaint ?? 'Not documented yet.'}</div></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinical summary</p><div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6">{encounter.clinical_summary ?? 'Not documented yet.'}</div></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment</p><div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6">{encounter.assessment ?? 'Not documented yet.'}</div></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p><div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6">{encounter.plan ?? 'Not documented yet.'}</div></div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ClipboardCheck size={18} /></div><div><h2 className="font-semibold">Diagnoses</h2><p className="text-sm text-slate-500">Diagnoses recorded during this encounter.</p></div></div>
              <div className="mt-5 space-y-3">{(diagnoses ?? []).map((d) => <div key={d.encounter_diagnosis_id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{d.diagnosis_text}</p><p className="mt-1 text-xs text-slate-500">{d.is_primary ? 'Primary diagnosis' : 'Secondary diagnosis'} · {d.severity ?? 'Severity not recorded'}</p></div><span className="text-xs text-slate-400">{formatDateTime(d.diagnosed_at)}</span></div>{d.notes && <p className="mt-3 text-sm text-slate-500">{d.notes}</p>}</div>)}{(diagnoses ?? []).length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No diagnoses recorded for this encounter.</p>}</div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Activity size={18} /></div><div><h2 className="font-semibold">Vitals</h2><p className="text-sm text-slate-500">Most recent measurements.</p></div></div>
              <div className="mt-5 space-y-3">{(vitals ?? []).slice(0,3).map((v) => <div key={v.vital_id} className="rounded-xl bg-slate-50 p-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-500">BP</p><p className="font-semibold">{v.systolic_bp ?? '—'}/{v.diastolic_bp ?? '—'} mmHg</p></div><div><p className="text-xs text-slate-500">Pulse</p><p className="font-semibold">{v.pulse_rate ?? '—'} bpm</p></div><div><p className="text-xs text-slate-500">Temp</p><p className="font-semibold">{v.temperature_c ?? '—'} °C</p></div><div><p className="text-xs text-slate-500">SpO₂</p><p className="font-semibold">{v.spo2_percent ?? '—'}%</p></div><div><p className="text-xs text-slate-500">Weight</p><p className="font-semibold">{v.weight_kg ?? '—'} kg</p></div><div><p className="text-xs text-slate-500">Pain</p><p className="font-semibold">{v.pain_score ?? '—'}/10</p></div></div><p className="mt-3 text-xs text-slate-400">{formatDateTime(v.recorded_at)}</p></div>)}{(vitals ?? []).length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No vitals recorded yet.</p>}</div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Pill size={18} /></div><div><h2 className="font-semibold">Prescription</h2><p className="text-sm text-slate-500">Medication workflow coming next.</p></div></div>
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center"><Pill className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-medium">Prescription workspace</p><p className="mt-1 text-xs leading-5 text-slate-500">Medication, dose, route, frequency, duration and dispensing will connect here.</p></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><FileText size={18} /></div><div><h2 className="font-semibold">Encounter timeline</h2><p className="text-sm text-slate-500">Clinical record timestamps.</p></div></div>
              <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-500">Started</span><span className="font-medium">{formatDateTime(encounter.started_at)}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Completed</span><span className="font-medium">{formatDateTime(encounter.completed_at)}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Signed</span><span className="font-medium">{formatDateTime(encounter.signed_at)}</span></div></div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
