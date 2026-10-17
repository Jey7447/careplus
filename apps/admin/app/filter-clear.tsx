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
        wrapper.className = 'careplus-filter-clear-wrap';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'careplus-filter-clear';
        button.setAttribute('aria-label', 'Clear search and filters');
        button.innerHTML = '<span>Clear</span>';
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
