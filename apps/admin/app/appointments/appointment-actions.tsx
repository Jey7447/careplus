'use client';

import {
  CalendarClock,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  LogIn,
  Play,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ACTIONS = {
  Scheduled: [
    { status: 'Confirmed', label: 'Confirm appointment', tone: 'primary', Icon: Check },
    { status: 'Cancelled', label: 'Cancel appointment', tone: 'danger', Icon: CircleX },
    { status: 'No Show', label: 'Mark no-show', tone: 'secondary', Icon: UserX },
  ],
  Confirmed: [
    { status: 'Checked In', label: 'Check in patient', tone: 'primary', Icon: LogIn },
    { status: 'Cancelled', label: 'Cancel appointment', tone: 'danger', Icon: CircleX },
    { status: 'No Show', label: 'Mark no-show', tone: 'secondary', Icon: UserX },
  ],
  'Checked In': [
    { status: 'In Progress', label: 'Start appointment', tone: 'primary', Icon: Play },
  ],
  'In Progress': [
    { status: 'Completed', label: 'Complete appointment', tone: 'primary', Icon: CircleCheck },
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
  const canReschedule = currentStatus === 'Scheduled' || currentStatus === 'Confirmed';
  const isFinalStatus = actions.length === 0;

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
      if (!response.ok) throw new Error(result?.error ?? 'Unable to update appointment status.');
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update appointment status.');
    } finally {
      setLoadingStatus(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Clock3 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Appointment actions</h2>
              {!isFinalStatus && (
                <span className="hidden rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline-flex">
                  {currentStatus}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {isFinalStatus ? 'This appointment has reached a final status.' : `Manage appointment #${appointmentId} from its current status.`}
            </p>
          </div>
        </div>
        {canReschedule && (
          <Link
            href={`/appointments/${appointmentId}/reschedule`}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md sm:w-auto"
          >
            <CalendarClock size={16} className="transition-transform duration-200 group-hover:scale-110" />
            Reschedule
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isFinalStatus && (
        <div className="grid gap-3 p-5 sm:flex sm:flex-wrap sm:p-6">
          {actions.map((action) => {
            const Icon = action.Icon;
            const isLoading = loadingStatus === action.status;
            const base = 'group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';
            const tone =
              action.tone === 'danger'
                ? 'border border-red-200 bg-red-50 text-red-700 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md'
                : action.tone === 'primary'
                  ? 'bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md'
                  : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md';

            return (
              <button
                key={action.status}
                type="button"
                onClick={() => handleAction(action)}
                disabled={loadingStatus !== null}
                className={`${base} ${tone}`}
              >
                <Icon size={16} className="transition-transform duration-200 group-hover:scale-110" />
                {isLoading ? 'Updating…' : action.label}
              </button>
            );
          })}
        </div>
      )}

      {isFinalStatus && (
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <CircleCheck size={17} className="shrink-0 text-slate-500" />
            No further status actions are available for this appointment.
          </div>
        </div>
      )}
    </section>
  );
}
