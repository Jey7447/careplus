import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from './theme-toggle';
import AdminFeedbackNavPatch from './admin-feedback-nav-patch';

export const metadata: Metadata = {
  title: 'CarePlus Medical Centre',
  description: 'CarePlus administration dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <AdminFeedbackNavPatch />
        <ThemeToggle />
      </body>
    </html>
  );
}
