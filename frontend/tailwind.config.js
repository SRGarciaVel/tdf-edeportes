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
          // texto secundario tunado a la paleta (lavanda, no gris
          // genérico) — reemplazan a gray-500/600/700 de Tailwind, que
          // contra este fondo (#0D0710) dan 4.1:1 / 2.6:1 / 1.9:1: los
          // dos últimos fallan directamente el mínimo de accesibilidad
          // AA (4.5:1 texto normal). Calibrados de verdad, no a ojo —
          // ver el cálculo en la conversación del 19-08-2026.
          muted: "#aba4b7", // ~8.3:1 — texto secundario real: timestamps, descripciones, stats
          faint: "#817891", // ~4.8:1 — el mínimo AA, solo para lo más decorativo
        },
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        // texto de lectura real (párrafos, metadata, labels) — Rajdhani
        // es una fuente "display" angosta pensada para títulos grandes,
        // no para cuerpo de texto; a tamaño chico se sentía débil aunque
        // el contraste de color estuviera bien (conversación 20-08-2026:
        // "sigue pareciendo IA genérica"). JetBrains Mono se reserva para
        // la convención "// XX: SECCIÓN" y poco más, no para todo lo
        // secundario como se venía usando.
        body: ["IBM Plex Sans", "sans-serif"],
        // acento tipo "spray" — solo para el wordmark hero, no para uso
        // general (una fuente de impacto se usa poco, o pierde impacto)
        graffiti: ["Rubik Wet Paint", "cursive"],
      },
    },
  },
  plugins: [],
};
