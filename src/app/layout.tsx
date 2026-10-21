import type { Metadata } from "next";
import "./globals.css";
import { getConfig } from "@/lib/config";
import { CONFIG_PADRAO } from "@/lib/config-padrao";
import { cssTema } from "@/lib/cores";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  // Logo enviada no painel vira o ícone da aba; sem ela, usa o ícone padrão recortado
  const icone = config.logoMarcaUrl === CONFIG_PADRAO.logoMarcaUrl ? "/icon.png" : config.logoMarcaUrl;
  return {
    title: `${config.nome} · Gestão`,
    description: `Portal de inquilinos e administração da ${config.nome}`,
    icons: {
      icon: icone,
      apple: config.logoMarcaUrl === CONFIG_PADRAO.logoMarcaUrl ? "/apple-icon.png" : config.logoMarcaUrl,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500&display=swap"
        />
        {/* Cores escolhidas no painel de Configurações */}
        <style dangerouslySetInnerHTML={{ __html: cssTema(config.corPrimaria, config.corMenu) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
