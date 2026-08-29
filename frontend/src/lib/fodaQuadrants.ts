import { AlertTriangle, Compass, TrendingDown, TrendingUp } from "lucide-react";

export type FodaQuadrantKey =
  "fortalezas" | "oportunidades" | "debilidades" | "amenazas";

interface QuadrantConfig {
  key: FodaQuadrantKey;
  label: string;
  Icon: typeof TrendingUp;
  border: string;
  bg: string;
  iconColor: string;
  placeholder: string;
}

/** Los 4 cuadrantes clásicos de un FODA, cada uno con su propio color
 * semántico (verde=fortaleza, celeste=oportunidad, ámbar=debilidad,
 * rojo=amenaza) — mismo lenguaje de color que cualquier FODA de
 * powerpoint corporativo, pero llevado a la estética oscura/HUD del
 * sitio en vez de un fondo blanco de oficina. Un solo lugar para esta
 * config, la usan tanto el formulario como la vista de cada entrada. */
export const FODA_QUADRANTS: QuadrantConfig[] = [
  {
    key: "fortalezas",
    label: "Fortalezas",
    Icon: TrendingUp,
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/[0.06]",
    iconColor: "text-emerald-400",
    placeholder: "¿Qué hace bien? ¿En qué es más fuerte que el resto?",
  },
  {
    key: "oportunidades",
    label: "Oportunidades",
    Icon: Compass,
    border: "border-sky-500/40",
    bg: "bg-sky-500/[0.06]",
    iconColor: "text-sky-400",
    placeholder: "¿Qué podría aprovechar? ¿Dónde hay margen para crecer?",
  },
  {
    key: "debilidades",
    label: "Debilidades",
    Icon: TrendingDown,
    border: "border-amber-500/40",
    bg: "bg-amber-500/[0.06]",
    iconColor: "text-amber-400",
    placeholder: "¿Qué le cuesta? ¿Dónde flaquea?",
  },
  {
    key: "amenazas",
    label: "Amenazas",
    Icon: AlertTriangle,
    border: "border-red-500/40",
    bg: "bg-red-500/[0.06]",
    iconColor: "text-red-400",
    placeholder: "¿Qué lo puede complicar? ¿Qué riesgos hay afuera?",
  },
];
