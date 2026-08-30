import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Julia — Cadrage des projets ingénieur',
  description: "Julia aide à cadrer un mémoire technique, un projet ADS ou un PFE avant l'échange avec l'équipe pédagogique.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffd800',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
