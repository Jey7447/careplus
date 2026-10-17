'use client';

import { useEffect } from 'react';

function greetingForNow() {
  const hour = Number(
    new Intl.DateTimeFormat('en-NG', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Africa/Lagos',
    }).format(new Date()),
  );

  if (hour >= 5 && hour < 12) return 'Good morning, Admin.';
  if (hour >= 12 && hour < 17) return 'Good afternoon, Admin.';
  return 'Good evening, Admin.';
}

/** Keeps the admin dashboard greeting aligned with CarePlus clinic time. */
export default function TimeAwareGreeting() {
  useEffect(() => {
    if (window.location.pathname !== '/dashboard') return;

    const update = () => {
      document.querySelectorAll('h1').forEach((heading) => {
        if (heading.textContent?.trim().match(/^Good (morning|afternoon|evening), Admin\.$/)) {
          heading.textContent = greetingForNow();
        }
      });
    };

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
