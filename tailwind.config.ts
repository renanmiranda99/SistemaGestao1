import type { Config } from "tailwindcss";

const config: Config = {
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
        // Neutros do estilo Stripe (fundo, bordas, textos de apoio)
        stone: {
          50: "#f6f9fc",
          100: "#eef2f7",
          200: "#e3e8ee",
          300: "#d5dbe3",
          400: "#a3acb9",
          500: "#8792a2",
          600: "#425466",
          700: "#3c4257",
          800: "#2a2f45",
          900: "#0a2540",
        },
      },
    },
  },
  plugins: [],
};
export default config;
