import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Instituto Fortuna",
  description: "Listas de contatos e integração com GreatPages do Instituto Fortuna.",
  metadataBase: new URL("https://crm-instituto-fortuna.michelbrasio.chatgpt.site"),
  openGraph: { title: "CRM Instituto Fortuna", description: "Listas de contatos integradas ao GreatPages.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "CRM Instituto Fortuna", description: "Listas de contatos integradas ao GreatPages.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
