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
        // Azul-marinho da identidade (menu lateral, botões, links)
        brand: {
          50: "#eef3fa",
          100: "#dce7f5",
          200: "#b9cde8",
          500: "#2b5fa0",
          600: "#1d4e89",
          700: "#163c6b",
          800: "#183558",
          900: "#0f2540",
        },
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
