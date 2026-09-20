'use client';

import { Check, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STATUSES = ['New', 'Reviewed', 'Follow-up Required', 'Resolved'] as const;
type FeedbackStatus = (typeof STATUSES)[number];

type Props = {
  feedbackId: number;
  currentStatus: FeedbackStatus;
};

const actions: Record<FeedbackStatus, { status: FeedbackStatus; label: string; className: string; icon: typeof Check }[]> = {
  New: [
    { status: 'Reviewed', label: 'Mark as Reviewed', className: 'bg-slate-900 text-white hover:bg-slate-800', icon: Check },
    { status: 'Follow-up Required', label: 'Require Follow-up', className: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100', icon: AlertCircle },
  ],
  Reviewed: [
    { status: 'Resolved', label: 'Mark as Resolved', className: 'bg-slate-900 text-white hover:bg-slate-800', icon: Check },
    { status: 'Follow-up Required', label: 'Require Follow-up', className: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100', icon: AlertCircle },
  ],
  'Follow-up Required': [
    { status: 'Resolved', label: 'Mark as Resolved', className: 'bg-slate-900 text-white hover:bg-slate-800', icon: Check },
    { status: 'Reviewed', label: 'Mark as Reviewed', className: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', icon: Check },
  ],
  Resolved: [
    { status: 'Reviewed', label: 'Reopen as Reviewed', className: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', icon: RotateCcw },
    { status: 'Follow-up Required', label: 'Reopen for Follow-up', className: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100', icon: AlertCircle },
  ],
};

export default function StatusActions({ feedbackId, currentStatus }: Props) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<FeedbackStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: FeedbackStatus) {
    setPendingStatus(status);
    setError(null);

    try {
      const response = await fetch(`/api/patient-feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to update feedback status.');
      }

      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update feedback status.');
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Manage feedback</p>
          <p className="mt-1 text-sm text-slate-500">Update the follow-up status as staff handle this response.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions[currentStatus].map(({ status, label, className, icon: Icon }) => (
            <button
              key={status}
              type="button"
              onClick={() => updateStatus(status)}
              disabled={pendingStatus !== null}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            >
              {pendingStatus === status ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              {pendingStatus === status ? 'Updating…' : label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
