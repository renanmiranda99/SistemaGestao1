import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Cores do tema, definidas no painel de Configurações (variáveis CSS geradas em src/lib/cores.ts).
        // 50–700 vêm da cor principal (botões, links); 800–900 da cor do menu.
        brand: Object.fromEntries(
          [50, 100, 200, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])
        ),
        // Neutros frios do novo design (fundo, bordas, divisórias)
        stone: {
          50: "#f4f6f9",
          100: "#edf0f4",
          200: "#e1e5ec",
          300: "#d3d9e2",
          400: "#b4bcc8",
          500: "#8a94a3",
          600: "#586274",
          700: "#3d4757",
          800: "#2a3342",
          900: "#141b26",
        },
      },
    },
  },
  plugins: [],
};
export default config;
