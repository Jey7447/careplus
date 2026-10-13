'use client';

import { CheckCircle2, Save, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

type Note = {
  chief_complaint: string | null;
  clinical_summary: string | null;
  assessment: string | null;
  plan: string | null;
};
type Props = { encounterId: number; status: string; initial: Note };

export default function EncounterNoteEditor({ encounterId, status, initial }: Props) {
  const [values, setValues] = useState({
    chief_complaint: initial.chief_complaint ?? '',
    clinical_summary: initial.clinical_summary ?? '',
    assessment: initial.assessment ?? '',
    plan: initial.plan ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const readOnly = !['Draft', 'In Progress'].includes(status);

  function update(field: keyof typeof values, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setSaved(false);
  }

  async function saveNote() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch(`/api/encounters/${encounterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Could not save clinical note.');
      if (result?.encounter) {
        setValues({
          chief_complaint: result.encounter.chief_complaint ?? '',
          clinical_summary: result.encounter.clinical_summary ?? '',
          assessment: result.encounter.assessment ?? '',
          plan: result.encounter.plan ?? '',
        });
      }
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save clinical note.');
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof values; label: string; hint: string }[] = [
    { key: 'chief_complaint', label: 'Chief complaint', hint: 'The patient’s presenting concern.' },
    { key: 'clinical_summary', label: 'Clinical summary', hint: 'Relevant history and findings from this consultation.' },
    { key: 'assessment', label: 'Assessment', hint: 'Your clinical assessment and reasoning.' },
    { key: 'plan', label: 'Plan', hint: 'Next steps, advice, investigations, or follow-up.' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Save size={18} /></div>
        <div><h2 className="font-semibold">Clinical assessment</h2><p className="text-sm text-slate-500">Save the clinical note as a draft. Saving does not sign or complete the encounter.</p></div>
      </div>
      {readOnly && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">This encounter is {status.toLowerCase()} and is read-only.</p>}
      <div className="mt-5 space-y-5">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-semibold text-slate-800">{field.label}</span>
            <span className="mt-1 block text-xs text-slate-500">{field.hint}</span>
            <textarea
              value={values[field.key]}
              onChange={(event) => update(field.key, event.target.value)}
              disabled={readOnly || saving}
              maxLength={10000}
              rows={field.key === 'chief_complaint' ? 2 : 4}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
              placeholder={`Document ${field.label.toLowerCase()}…`}
            />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><TriangleAlert size={18} className="shrink-0" />{error}</p>}
      {saved && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={18} />Clinical note saved. Encounter remains unsigned.</p>}
      {!readOnly && <button type="button" onClick={saveNote} disabled={saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? 'Saving…' : 'Save clinical note'}</button>}
    </section>
  );
}
