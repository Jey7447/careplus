'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DoctorDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Doctor dashboard error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Doctor dashboard could not load</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your sign-in is still active, but the dashboard encountered a problem while loading its clinical data.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
