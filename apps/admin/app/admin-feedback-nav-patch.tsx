'use client';

import { useEffect } from 'react';

export default function AdminFeedbackNavPatch() {
  useEffect(() => {
    const feedbackHref = '/feedback';

    const patchNav = (nav: HTMLElement) => {
      // Do not duplicate the link if the page already defines it.
      if (nav.querySelector(`a[href="${feedbackHref}"]`)) return;

      const link = document.createElement('a');
      link.href = feedbackHref;
      link.className =
        'group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white';
      link.innerHTML = `
        <span aria-hidden="true" class="grid h-[18px] w-[18px] place-items-center">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18" />
            <path d="M3 15h4" />
            <path d="M3 9h7" />
            <path d="M3 21h18" />
            <path d="M10 9h4" />
            <path d="M10 15h4" />
            <path d="M10 3h4" />
            <path d="M17 3h4v18h-4" />
          </svg>
        </span>
        <span>Feedback</span>
      `;

      link.addEventListener('click', () => {
        // Let Next.js handle normal client navigation when possible.
        // The native anchor remains fully functional as a fallback.
      });

      nav.appendChild(link);
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>('aside nav').forEach(patchNav);
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
