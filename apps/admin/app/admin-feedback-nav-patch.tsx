'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { createRoot, type Root } from 'react-dom/client';
import { useEffect } from 'react';

export default function AdminFeedbackNavPatch() {
  useEffect(() => {
    const roots = new Map<HTMLElement, Root>();

    const patchNav = (nav: HTMLElement) => {
      if (nav.querySelector('a[href="/feedback"]')) return;

      const mount = document.createElement('div');
      nav.appendChild(mount);

      const root = createRoot(mount);
      root.render(
        <Link
          href="/feedback"
          className="group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <BarChart3 size={18} />
          <span>Feedback</span>
        </Link>,
      );

      roots.set(mount, root);
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>('aside nav').forEach(patchNav);
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const [mount, root] of roots) {
        root.unmount();
        mount.remove();
      }
      roots.clear();
    };
  }, []);

  return null;
}
