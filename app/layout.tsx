import './globals.css';
import type { Metadata } from 'next';
import SidebarShell from '@/components/SidebarShell';

export const metadata: Metadata = {
  title: 'R-Cloud — Rapsodo Golf',
  description: 'Your shots, your progress.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Adobe Fonts kit — acumin-pro-extra-condensed + Barlow (matches rapsodo app) */}
        <link rel="stylesheet" href="https://use.typekit.net/ptp6igk.css" />
      </head>
      <body>
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
