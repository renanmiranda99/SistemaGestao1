import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f5",
          100: "#dcebe4",
          500: "#2f7a5f",
          600: "#246249",
          700: "#1d4f3b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
