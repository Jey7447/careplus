'use client';

import { HeartPulse, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminShell() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasSidebar, setHasSidebar] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    setReady(false);
    const sidebar = document.querySelector<HTMLElement>('aside nav')?.closest('aside');
    if (!sidebar) return;

    // The root layout persists during client navigation, so re-bind when the route changes.

    setHasSidebar(true);
    sidebar.classList.add('careplus-sidebar');
    sidebar.classList.toggle('careplus-collapsed', desktopCollapsed);
    setMobileOpen(false);

    const closeMobile = () => setMobileOpen(false);
    sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobile));

    setReady(true);

    return () => {
      sidebar.classList.remove('careplus-sidebar', 'careplus-collapsed', 'careplus-mobile-open');
      sidebar.querySelectorAll('a').forEach((link) => link.removeEventListener('click', closeMobile));
    };
  }, [pathname]);

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('aside.careplus-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('careplus-collapsed', desktopCollapsed);
  }, [desktopCollapsed]);

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('aside.careplus-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('careplus-mobile-open', mobileOpen);
    document.body.classList.toggle('careplus-menu-open', mobileOpen);
    return () => document.body.classList.remove('careplus-menu-open');
  }, [mobileOpen]);

  if (!ready || !hasSidebar) return null;

  return (
    <>
      <div className="careplus-mobile-header">
        <div className="careplus-mobile-brand">
          <span className="careplus-mobile-brand-icon"><HeartPulse size={18} /></span>
          <span>CarePlus</span>
        </div>
        <button
          type="button"
          className="careplus-menu-button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <button
        type="button"
        className={`careplus-desktop-toggle${desktopCollapsed ? " is-collapsed" : ""}`}
        onClick={() => setDesktopCollapsed((collapsed) => !collapsed)}
        aria-label={desktopCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        title={desktopCollapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
        {desktopCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="careplus-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
    </>
  );
}
