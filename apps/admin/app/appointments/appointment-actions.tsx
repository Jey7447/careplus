'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ACTIONS = {
  Scheduled: [
    { status: 'Confirmed', label: 'Confirm appointment', tone: 'primary' },
    { status: 'Cancelled', label: 'Cancel appointment', tone: 'danger' },
    { status: 'No Show', label: 'Mark no-show', tone: 'secondary' },
  ],
  Confirmed: [
    { status: 'Checked In', label: 'Check in patient', tone: 'primary' },
    { status: 'Cancelled', label: 'Cancel appointment', tone: 'danger' },
    { status: 'No Show', label: 'Mark no-show', tone: 'secondary' },
  ],
  'Checked In': [
    { status: 'In Progress', label: 'Start appointment', tone: 'primary' },
  ],
  'In Progress': [
    { status: 'Completed', label: 'Complete appointment', tone: 'primary' },
  ],
  Completed: [],
  Cancelled: [],
  'No Show': [],
} as const;

type AppointmentStatus = keyof typeof ACTIONS;
type Action = (typeof ACTIONS)[AppointmentStatus][number];

type Props = {
  appointmentId: number;
  currentStatus: string;
};

export default function AppointmentActions({ appointmentId, currentStatus }: Props) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [error, setError] = useState('');

  const actions = (ACTIONS as Record<string, readonly Action[]>)[currentStatus] ?? [];

  async function handleAction(action: Action) {
    const confirmed = window.confirm(
      `Are you sure you want to ${action.label.toLowerCase()}?\n\nAppointment #${appointmentId}\nCurrent status: ${currentStatus}\nNew status: ${action.status}`,
    );
    if (!confirmed) return;

    setError('');
    setLoadingStatus(action.status);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.status }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? 'Unable to update appointment status.');
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update appointment status.');
    } finally {
      setLoadingStatus(null);
    }
  }

  if (actions.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <h2 className="font-semibold">Appointment actions</h2>
        <p className="mt-2 text-sm text-slate-500">No further status actions are available for this appointment.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div>
        <h2 className="font-semibold">Appointment actions</h2>
        <p className="mt-1 text-sm text-slate-500">Available actions for the current status: {currentStatus}.</p>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => handleAction(action)}
            disabled={loadingStatus !== null}
            className={
              action.tone === 'danger'
                ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
                : action.tone === 'primary'
                  ? 'rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {loadingStatus === action.status ? 'Updating…' : action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
