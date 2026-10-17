'use client';

import { useEffect } from 'react';

/** Adds a consistent one-click reset to every GET-based search/filter form. */
export default function FilterClear() {
  useEffect(() => {
    const enhance = () => {
      document.querySelectorAll<HTMLFormElement>('form[method="get"]:not([data-clear-enhanced])').forEach((form) => {
        form.dataset.clearEnhanced = 'true';

        const controls = Array.from(form.elements).filter((element) =>
          element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement,
        );
        if (!controls.length) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'shrink-0';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 sm:px-5';
        button.setAttribute('aria-label', 'Clear search and filters');
        button.textContent = 'Clear';
        button.addEventListener('click', () => {
          window.location.assign(window.location.pathname);
        });

        const submit = form.querySelector('button[type="submit"]');
        if (submit?.parentElement) {
          submit.parentElement.insertBefore(wrapper, submit);
        } else {
          form.appendChild(wrapper);
        }
        wrapper.appendChild(button);
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
