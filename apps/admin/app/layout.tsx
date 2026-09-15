import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = {
  title: 'CarePlus Medical Centre',
  description: 'CarePlus administration dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
