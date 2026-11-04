import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Cores do tema, definidas no painel de Configurações (variáveis CSS geradas em src/lib/cores.ts).
        // 50–700 vêm da cor principal (botões, links); 800–900 da cor do menu.
        brand: Object.fromEntries(
          [50, 100, 200, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])
        ),
        // Neutros do estilo Stripe (fundo, bordas, textos de apoio); trocam no modo escuro (globals.css)
        stone: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--n-${n}) / <alpha-value>)`])
        ),
        // Fundo de cartões, menus e campos: branco no modo claro, azul-noite no escuro
        superficie: "rgb(var(--superficie) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
