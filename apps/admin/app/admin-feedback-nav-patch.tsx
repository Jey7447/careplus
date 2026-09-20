'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { createRoot, type Root } from 'react-dom/client';
import { useEffect } from 'react';

export default function AdminFeedbackNavPatch() {
  useEffect(() => {
    const roots: Root[] = [];
    const navs = Array.from(document.querySelectorAll('aside nav'));

    for (const nav of navs) {
      if (nav.querySelector('a[href="/feedback"]')) continue;

      const mount = document.createElement('div');
      nav.appendChild(mount);

      const root = createRoot(mount);
      root.render(
        <Link
          href="/feedback"
          className="group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <BarChart3 size={18} />
          <span>Feedback</span>
        </Link>,
      );

      roots.push(root);
    }

    return () => {
      for (const root of roots) root.unmount();
    };
  }, []);

  return null;
}
