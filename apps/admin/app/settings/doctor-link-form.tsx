'use client';

import { useState } from 'react';

export default function DoctorLinkForm({ doctorId }: { doctorId: number }) {
  const [authUserId, setAuthUserId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      const response = await fetch('/api/staff/link-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: authUserId, doctor_id: doctorId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to link doctor');
      setMessage('Doctor account linked successfully. Refreshing…');
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to link doctor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block text-xs font-medium text-slate-600">
        Supabase Auth user ID
        <input
          value={authUserId}
          onChange={(event) => setAuthUserId(event.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          required
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Linking…' : 'Link doctor account'}
      </button>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </form>
  );
}
