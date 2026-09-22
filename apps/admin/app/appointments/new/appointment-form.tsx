'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Doctor = {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialty: string | null;
  branch_id: number | null;
  branch_name: string;
};

type Patient = {
  patient_id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  email: string | null;
  address: string;
};

const appointmentTypes = [
  'Consultation',
  'Follow-up',
  'Emergency',
  'Lab Test',
  'Vaccination',
  'Surgery',
  'Physical Examination',
] as const;

const genders = ['Male', 'Female', 'Other'] as const;

type Props = { doctors: Doctor[] };

type PatientForm = {
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: (typeof genders)[number] | '';
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

const emptyPatient: PatientForm = {
  first_name: '',
  last_name: '',
  phone_number: '',
  date_of_birth: '',
  gender: '',
  email: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
};

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{children}</label>;
}

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:opacity-60';

export default function AppointmentForm({ doctors }: Props) {
  const router = useRouter();
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientForm>(emptyPatient);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [appointmentType, setAppointmentType] = useState<(typeof appointmentTypes)[number]>('Consultation');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const selectedDoctor = doctors.find((doctor) => String(doctor.doctor_id) === doctorId);

  useEffect(() => {
    if (patientMode !== 'existing') return;
    const query = patientSearch.trim();
    if (query.length < 2) {
      setPatients([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/patients/search?search=${encodeURIComponent(query)}`, { signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? 'Unable to search patients.');
        setPatients(result?.patients ?? []);
      } catch (searchError) {
        if ((searchError as Error).name !== 'AbortError') setError(searchError instanceof Error ? searchError.message : 'Unable to search patients.');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [patientMode, patientSearch]);

  function choosePatient(value: Patient) {
    setSelectedPatient(value);
    setPatientSearch(`${value.first_name} ${value.last_name}`);
    setPatients([]);
    setError('');
  }

  function switchMode(mode: 'existing' | 'new') {
    setPatientMode(mode);
    setSelectedPatient(null);
    setPatientSearch('');
    setPatients([]);
    setError('');
  }

  function updatePatient<K extends keyof PatientForm>(key: K, value: PatientForm[K]) {
    setPatient((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (patientMode === 'existing' && !selectedPatient) {
      setError('Search for and select an existing patient first.');
      return;
    }

    if (!doctorId || !date || !time) {
      setError('Please select a doctor, date and time.');
      return;
    }

    if (patientMode === 'new' && (!patient.first_name.trim() || !patient.last_name.trim() || !patient.phone_number.trim() || !patient.date_of_birth || !patient.gender || !patient.address.trim())) {
      setError('Please complete all required new-patient fields.');
      return;
    }

    const doctorName = selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : 'selected doctor';
    const patientName = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : `${patient.first_name} ${patient.last_name}`;
    const confirmed = window.confirm(`Create appointment?\n\nPatient: ${patientName}\nDoctor: ${doctorName}\nBranch: ${selectedDoctor?.branch_name ?? 'Assigned branch'}\nDate: ${date}\nTime: ${time}\nType: ${appointmentType}`);
    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.patient_id ?? null,
          patient: patientMode === 'new' ? patient : undefined,
          doctor_id: Number(doctorId),
          appointment_date: date,
          appointment_time: time,
          appointment_type: appointmentType,
          reason_for_visit: reasonForVisit,
          notes,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Unable to create appointment.');

      const createdId = result?.appointment?.appointment_id;
      if (!createdId) throw new Error('Appointment was created but its ID could not be returned.');

      router.push(`/appointments/${createdId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create appointment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-semibold text-slate-950">1. Patient</h2><p className="mt-1 text-sm text-slate-500">Find an existing patient or register a new one.</p></div>
          <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
            <button type="button" onClick={() => switchMode('existing')} className={`rounded-lg px-3 py-2 font-medium ${patientMode === 'existing' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Existing patient</button>
            <button type="button" onClick={() => switchMode('new')} className={`rounded-lg px-3 py-2 font-medium ${patientMode === 'new' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>New patient</button>
          </div>
        </div>

        {patientMode === 'existing' ? (
          <div className="mt-6">
            <Field label="Search patient" required>
              <input value={patientSearch} onChange={(event) => { setPatientSearch(event.target.value); setSelectedPatient(null); }} placeholder="Name, phone number or email" className={inputClass} disabled={loading} />
            </Field>
            <p className="mt-2 text-xs text-slate-500">Type at least 2 characters to search.</p>
            {searching && <p className="mt-3 text-sm text-slate-500">Searching patients…</p>}
            {patients.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                {patients.map((item) => (
                  <button type="button" key={item.patient_id} onClick={() => choosePatient(item)} className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">{item.first_name} {item.last_name}</p>
                    <p className="mt-1 text-xs text-slate-500">#{item.patient_id} · {item.phone_number}{item.email ? ` · ${item.email}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm font-medium text-slate-900">Selected: {selectedPatient.first_name} {selectedPatient.last_name}</p><p className="mt-1 text-xs text-slate-500">Patient #{selectedPatient.patient_id} · {selectedPatient.phone_number}</p></div>}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="First name" required><input value={patient.first_name} onChange={(e) => updatePatient('first_name', e.target.value)} className={inputClass} disabled={loading} /></Field>
            <Field label="Last name" required><input value={patient.last_name} onChange={(e) => updatePatient('last_name', e.target.value)} className={inputClass} disabled={loading} /></Field>
            <Field label="Phone number" required><input type="tel" value={patient.phone_number} onChange={(e) => updatePatient('phone_number', e.target.value)} className={inputClass} disabled={loading} /></Field>
            <Field label="Date of birth" required><input type="date" value={patient.date_of_birth} onChange={(e) => updatePatient('date_of_birth', e.target.value)} max={minDate} className={inputClass} disabled={loading} /></Field>
            <Field label="Gender" required><select value={patient.gender} onChange={(e) => updatePatient('gender', e.target.value as PatientForm['gender'])} className={inputClass} disabled={loading}><option value="">Select gender</option>{genders.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Email"><input type="email" value={patient.email} onChange={(e) => updatePatient('email', e.target.value)} className={inputClass} disabled={loading} /></Field>
            <Field label="Address" required><input value={patient.address} onChange={(e) => updatePatient('address', e.target.value)} className={inputClass} disabled={loading} /></Field>
            <Field label="Emergency contact name"><input value={patient.emergency_contact_name} onChange={(e) => updatePatient('emergency_contact_name', e.target.value)} className={inputClass} disabled={loading} /></Field>
            <Field label="Emergency contact phone"><input type="tel" value={patient.emergency_contact_phone} onChange={(e) => updatePatient('emergency_contact_phone', e.target.value)} className={inputClass} disabled={loading} /></Field>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><h2 className="font-semibold text-slate-950">2. Appointment details</h2><p className="mt-1 text-sm text-slate-500">Choose the doctor, date, time and appointment type.</p></div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Doctor" required><select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputClass} disabled={loading}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>Dr. {doctor.first_name} {doctor.last_name}{doctor.specialty ? ` · ${doctor.specialty}` : ''}</option>)}</select></Field>
          <Field label="Branch"><input value={selectedDoctor?.branch_name ?? 'Select a doctor first'} readOnly className={`${inputClass} bg-slate-50 text-slate-600`} /></Field>
          <Field label="Date" required><input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} disabled={loading} /></Field>
          <Field label="Time" required><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} disabled={loading} /></Field>
          <Field label="Appointment type" required><select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value as (typeof appointmentTypes)[number])} className={inputClass} disabled={loading}>{appointmentTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
        {selectedDoctor && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Appointments for <b>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</b> are booked at <b>{selectedDoctor.branch_name}</b>. The server will check availability before creating the appointment.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><h2 className="font-semibold text-slate-950">3. Visit information</h2><p className="mt-1 text-sm text-slate-500">Add the reason for the visit and any useful notes.</p></div>
        <div className="mt-6 space-y-5">
          <Field label="Reason for visit"><textarea value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} rows={3} className={inputClass} disabled={loading} placeholder="e.g. Persistent cough, routine follow-up…" /></Field>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} disabled={loading} placeholder="Additional appointment notes" /></Field>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-3 pb-8">
        <button type="submit" disabled={loading} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Creating appointment…' : 'Create appointment'}</button>
        <button type="button" onClick={() => router.push('/appointments')} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
      </div>
    </form>
  );
}
