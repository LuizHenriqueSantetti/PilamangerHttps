import type { Metadata } from 'next';
import '../src/styles/tailwind.css';
import '../src/styles/theme.css';
import '../src/styles/index.css';
import '../src/styles/redesign.css';
import '../src/styles/panels.css';
import '../src/styles/notifications.css';

export const metadata: Metadata = {
  title: 'PilaManager 2.1',
  description: 'Sistema de gestão para clínicas e estúdios de Pilates.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/pilamanager-192.png',
    apple: '/icons/pilamanager-180.png',
  },
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
