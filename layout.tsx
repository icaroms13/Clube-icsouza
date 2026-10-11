import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clube de Indicações — IC Souza",
  description: "Indique, acumule pontos e resgate prêmios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-bone font-body min-h-screen">{children}</body>
    </html>
  );
}
