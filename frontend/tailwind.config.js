/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // placeholder extraído de las capturas del overlay actual del club —
        // reemplazar cuando Chubi entregue el manual de marca oficial (SPECS.md #9)
        tdf: {
          purple: "#5B2A86",
          magenta: "#C4147A",
          dark: "#0D0710",
        },
      },
    },
  },
  plugins: [],
};
