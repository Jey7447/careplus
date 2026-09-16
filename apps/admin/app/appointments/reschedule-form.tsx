'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Doctor = {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialty: string | null;
  branch_id: number | null;
};

type Props = {
  appointmentId: number;
  currentDate: string;
  currentTime: string;
  currentDoctorId: number;
  doctors: Doctor[];
  currentStatus: string;
};

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

function toTimeInputValue(value: string) {
  return value.slice(0, 5);
}

export default function RescheduleForm({
  appointmentId,
  currentDate,
  currentTime,
  currentDoctorId,
  doctors,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [date, setDate] = useState(toDateInputValue(currentDate));
  const [time, setTime] = useState(toTimeInputValue(currentTime));
  const [doctorId, setDoctorId] = useState(String(currentDoctorId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const selectedDoctor = doctors.find((doctor) => String(doctor.doctor_id) === doctorId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!date || !time || !doctorId) {
      setError('Please select a date, time and doctor.');
      return;
    }

    const confirmed = window.confirm(
      `Reschedule appointment #${appointmentId}?\n\nNew date: ${date}\nNew time: ${time}\nDoctor: Dr. ${selectedDoctor?.first_name ?? ''} ${selectedDoctor?.last_name ?? ''}`,
    );
    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, doctor_id: Number(doctorId) }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? 'Unable to reschedule appointment.');
      }

      router.push(`/appointments/${appointmentId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reschedule appointment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div>
        <p className="text-sm text-slate-500">Current status</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{currentStatus}</p>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <input
            type="date"
            min={minDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Time</span>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Doctor</span>
          <select
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
          >
            {doctors.map((doctor) => (
              <option key={doctor.doctor_id} value={doctor.doctor_id}>
                Dr. {doctor.first_name} {doctor.last_name}{doctor.specialty ? ` · ${doctor.specialty}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedDoctor && (
        <p className="mt-4 text-sm text-slate-500">
          Changing the doctor will use that doctor&apos;s assigned CarePlus branch. Availability is checked before saving.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Checking availability…' : 'Reschedule appointment'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
