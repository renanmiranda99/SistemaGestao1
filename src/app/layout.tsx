import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão da Galeria",
  description: "Portal de inquilinos e administração da galeria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
