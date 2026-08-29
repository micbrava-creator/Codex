import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Capta — CRM de contatos',
  description: 'Organize listas de contatos e receba leads do Great Pages por webhook.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
