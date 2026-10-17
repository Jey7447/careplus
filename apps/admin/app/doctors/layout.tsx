import Link from 'next/link';
import { ArrowRight, BarChart3, CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, Settings, Stethoscope, Users } from 'lucide-react';

const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Appointments', '/appointments', CalendarDays],
  ['Patients', '/patients', Users],
  ['Doctors', '/doctors', Stethoscope],
  ['Notifications', '/notifications', ClipboardList],
  ['Feedback', '/feedback', BarChart3],
  ['Settings', '/settings', Settings],
] as const;

export default function DoctorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="sticky top-0 z-40 flex w-full items-center gap-4 overflow-x-auto border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 pr-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
            <HeartPulse size={18} />
          </span>
          <span className="hidden text-sm font-semibold text-slate-950 sm:block">CarePlus</span>
        </Link>
        <div className="h-7 w-px shrink-0 bg-slate-200" />
        <div className="flex min-w-max items-center gap-1">
          {navigation.map(([label, href, Icon]) => {
            const active = label === 'Doctors';
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-teal-50 font-medium text-teal-800 ring-1 ring-teal-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <Icon size={17} />
                <span className="hidden sm:inline">{label}</span>
                {active && <ArrowRight size={14} className="hidden sm:inline" />}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </>
  );
}
