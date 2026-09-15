'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('careplus-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = saved === 'dark' || (!saved && prefersDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
    setDark(shouldUseDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('careplus-theme', next ? 'dark' : 'light');
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-5 right-5 z-50 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg outline-none transition hover:bg-slate-50 focus:outline-none focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
