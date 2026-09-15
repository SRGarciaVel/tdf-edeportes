import {
  Award,
  Calendar,
  Clapperboard,
  FileText,
  Gamepad2,
  Home,
  Info,
  LayoutGrid,
  Scale,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react";

// una sola fuente de verdad para los 4 grupos de navegación — antes
// estaban duplicados en Navbar.tsx (desktop) y MobileTabBar.tsx
// (mobile), con el riesgo real de que alguien agregue una página
// nueva a un grupo y se olvide de tocar el otro archivo (encontrado
// y corregido el mismo día que se armó la tab bar mobile, 13-09-2026)
export const DIRECT_LINKS = [{ to: "/", label: "Inicio", Icon: Home }];

export const JUGADORES_LINKS = [
  { to: "/jugadores", label: "Jugadores", Icon: Users },
  { to: "/personajes", label: "Personajes", Icon: Swords },
  { to: "/logros", label: "Logros", Icon: Award },
];

export const COMUNIDAD_LINKS = [
  { to: "/nosotros", label: "Nosotros", Icon: Info },
  { to: "/objetivos", label: "Objetivos", Icon: Target },
  { to: "/foda", label: "FODA", Icon: Scale },
  { to: "/puntos", label: "Puntos", Icon: Star },
  { to: "/test-personalidad", label: "Test de personalidad", Icon: Sparkles },
];

export const ACTIVIDAD_LINKS = [
  { to: "/calendario", label: "Calendario", Icon: Calendar },
  { to: "/torneos", label: "Torneos", Icon: Trophy },
  { to: "/tierlist", label: "Tier List", Icon: LayoutGrid },
  { to: "/recopilaciones", label: "Recopilaciones", Icon: Clapperboard },
];

export const SF6_LINKS = [
  { to: "/sf6/meta", label: "Meta actual", Icon: Gamepad2 },
  { to: "/sf6/patch-notes", label: "Notas de parche", Icon: FileText },
];

// para el buscador de "Páginas" en el navbar de escritorio — destinos
// fijos del sitio, no datos que haya que traer de ningún lado
export const SEARCHABLE_PAGES = [
  ...DIRECT_LINKS,
  ...JUGADORES_LINKS,
  ...COMUNIDAD_LINKS,
  ...ACTIVIDAD_LINKS,
  ...SF6_LINKS,
];
