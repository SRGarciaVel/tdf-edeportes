/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // paleta real del club (extraída del overlay/logo actuales) —
        // reemplazar cuando Chubi entregue el manual de marca oficial
        // (SPECS.md #9). Base oscura con matices, no negro puro.
        tdf: {
          purple: "#5B2A86",
          magenta: "#C4147A",
          dark: "#0D0710",
          charcoal: "#14101a",
          line: "#2a2230",
        },
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        // acento tipo "spray" — solo para el wordmark hero, no para uso
        // general (una fuente de impacto se usa poco, o pierde impacto)
        graffiti: ["Rubik Wet Paint", "cursive"],
      },
    },
  },
  plugins: [],
};
