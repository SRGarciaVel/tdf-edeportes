import { motion } from "framer-motion";
import { Home, LayoutGrid, Menu, Star, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import MobileBottomSheet from "./MobileBottomSheet";
import LoginButton from "./LoginButton";
import NotificationBell from "./NotificationBell";
import { listCfnPlayers } from "../lib/api";
import { staggerContainer, staggerItem } from "../lib/motionVariants";
import {
  ACTIVIDAD_LINKS,
  COMUNIDAD_LINKS,
  JUGADORES_LINKS,
  SF6_LINKS,
} from "../lib/navLinks";
import type { CFNPlayer } from "../lib/types";

// mismo orden que se dibujan los primeros 5 íconos — el blob liquid
// solo se mueve entre estos, nunca hacia el hamburguesa (ver más
// abajo): Jugadores y Comunidad navegan directo, Actividad y Perfil
// abren su propio panel (pedido de Seba, 13-09-2026: "no usemos
// submenú en los elementos principales para que el liquid blob tenga
// sentido" — el blob representa dónde estás de verdad, no un menú
// que abriste).
const TABS = [
  { key: "inicio", Icon: Home, label: "Inicio" },
  { key: "jugadores", Icon: Users, label: "Jugadores" },
  { key: "actividad", Icon: LayoutGrid, label: "Actividad" },
  { key: "comunidad", Icon: Star, label: "Comunidad" },
  { key: "perfil", Icon: User, label: "Perfil" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
// "menu" = el hamburguesa nuevo, aparte del set que trackea el blob
type OpenPanel = TabKey | "menu" | null;

// Jugadores y Comunidad ahora van directo a una página (ya no abren
// sub-menú) — lo que antes vivía como sus hermanos en el dropdown
// (Personajes/Logros, Nosotros/Objetivos/FODA) se muda al
// hamburguesa, categorizado
const HAMBURGUESA_JUGADORES = JUGADORES_LINKS.filter(
  (l) => l.to !== "/jugadores",
);
const HAMBURGUESA_COMUNIDAD = COMUNIDAD_LINKS.filter((l) => l.to !== "/puntos");

function activeTabFromPath(pathname: string): TabKey {
  if (
    JUGADORES_LINKS.some((l) => pathname.startsWith(l.to)) ||
    pathname.startsWith("/jugadores/")
  )
    return "jugadores";
  if (ACTIVIDAD_LINKS.some((l) => pathname.startsWith(l.to)))
    return "actividad";
  if (pathname.startsWith("/puntos")) return "comunidad";
  if (COMUNIDAD_LINKS.some((l) => pathname.startsWith(l.to)))
    return "comunidad";
  if (pathname.startsWith("/perfil") || pathname.startsWith("/admin"))
    return "perfil";
  return "inicio";
}

const TAB_SLOT = 56; // px por ícono, el blob se mueve en múltiplos de esto
const TOTAL_SLOTS = TABS.length + 1; // +1 = el hamburguesa, fuera del blob

function LinkList({
  links,
  onNavigate,
}: {
  links: { to: string; label: string }[];
  onNavigate: () => void;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-1"
    >
      {links.map((l) => (
        <motion.div key={l.to} variants={staggerItem}>
          <NavLink
            to={l.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded font-mono text-xs uppercase ${
                isActive
                  ? "text-tdf-magenta bg-tdf-magenta/10"
                  : "text-tdf-muted hover:bg-tdf-dark/60"
              }`
            }
          >
            {l.label}
          </NavLink>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Grilla de "carpeta de apps" para Actividad — referencia de Seba
 * (13-09-2026): "algo así como el sistema de Android de carpetas
 * donde se guardan las aplicaciones". Reusa ACTIVIDAD_LINKS tal cual
 * (ya trae su propio ícono por link), solo cambia cómo se dibuja
 * (grilla de íconos en vez de lista de texto). */
function ActividadGridContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3"
    >
      {ACTIVIDAD_LINKS.map(({ to, label, Icon }) => (
        <motion.div key={to} variants={staggerItem}>
          <NavLink
            to={to}
            onClick={onNavigate}
            className="flex flex-col items-center gap-2 py-5 rounded-xl bg-tdf-dark/40 hover:bg-tdf-dark/70 transition-colors"
          >
            <Icon size={26} className="text-tdf-magenta" />
            <span className="font-mono text-[10px] uppercase text-tdf-muted text-center">
              {label}
            </span>
          </NavLink>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Panel del hamburguesa nuevo — todo lo que dejó de tener un tab
 * directo propio cuando Jugadores/Comunidad pasaron a navegar directo
 * (pedido de Seba, 13-09-2026), categorizado igual que el viejo
 * drawer mobile. */
function MenuSheetContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
          Jugadores
        </p>
        <LinkList links={HAMBURGUESA_JUGADORES} onNavigate={onNavigate} />
      </div>
      <div className="pt-4 border-t border-tdf-line">
        <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
          Comunidad
        </p>
        <LinkList links={HAMBURGUESA_COMUNIDAD} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** Panel de "Perfil" — junta todo lo que en desktop vive suelto en la
 * barra (login, notificaciones, SF6) más un buscador simplificado.
 * Sin cambios en esta vuelta (pedido de Seba, 13-09-2026: "se queda
 * igual"). */
function PerfilSheetContent({ onNavigate }: { onNavigate: () => void }) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<CFNPlayer[]>([]);

  useEffect(() => {
    listCfnPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]));
  }, []);

  const q = query.trim().toLowerCase();
  const matched =
    q.length < 2
      ? []
      : players
          .filter((p) => p.display_name.toLowerCase().includes(q))
          .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <LoginButton variant="inline" />

      <div className="pt-4 border-t border-tdf-line flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase text-tdf-muted">
          Notificaciones
        </p>
        <NotificationBell />
      </div>

      <div className="pt-4 border-t border-tdf-line">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugadores..."
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-body"
        />
        {matched.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {matched.map((p) => (
              <NavLink
                key={p.cfn_id}
                to={`/jugadores/${p.cfn_id}`}
                onClick={onNavigate}
                className="px-3 py-2 font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-dark/60"
              >
                {p.display_name}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-tdf-line">
        <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
          SF6
        </p>
        <LinkList links={[...SF6_LINKS]} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** Tab bar flotante para mobile, con blob "liquid" que fluye entre
 * pestañas (referencias de Seba, 13-09-2026 — patrón de apps 2026).
 * El efecto liquid es el truco clásico de SVG (blur fuerte +
 * feColorMatrix que sube el contraste de la transparencia) aplicado
 * SOLO a la capa del blob — los íconos van en una capa separada sin
 * el filtro, encima, para que se vean nítidos.
 *
 * Segunda vuelta (13-09-2026): Jugadores y Comunidad pasaron a
 * navegar directo (antes abrían sub-menú) para que el blob siempre
 * represente una página real en la que estás, nunca un menú que
 * abriste. Actividad y Perfil siguen abriendo su propio panel (una
 * grilla tipo carpeta de Android, y el panel rico de siempre,
 * respectivamente) — el hamburguesa nuevo, aparte del set que
 * trackea el blob, junta todo lo que se quedó sin tab directo. */
export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  const routeTab = activeTabFromPath(location.pathname);
  // el hamburguesa ("menu") nunca mueve el blob — no representa
  // ninguna de las 5 posiciones que trackea
  const activeTab = openPanel && openPanel !== "menu" ? openPanel : routeTab;
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  function handleTabClick(key: TabKey) {
    if (key === "inicio") {
      setOpenPanel(null);
      navigate("/");
      return;
    }
    if (key === "jugadores") {
      setOpenPanel(null);
      navigate("/jugadores");
      return;
    }
    if (key === "comunidad") {
      setOpenPanel(null);
      navigate("/puntos");
      return;
    }
    // actividad y perfil abren su propio panel, no navegan directo
    setOpenPanel((current) => (current === key ? null : key));
  }

  function toggleMenu() {
    setOpenPanel((current) => (current === "menu" ? null : "menu"));
  }

  return (
    <>
      {/* el filtro no ocupa espacio visual, solo se define acá para
          que la capa del blob lo referencie */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="tdf-tab-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
            />
          </filter>
        </defs>
      </svg>

      <nav
        className="fixed bottom-4 inset-x-4 z-40 md:hidden mx-auto max-w-sm bg-tdf-charcoal/95 backdrop-blur border border-tdf-line rounded-full"
        style={{
          boxShadow: "0 8px 30px -8px rgba(0,0,0,0.7)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="relative h-14 flex items-center justify-center">
          <div
            className="relative"
            style={{ width: TAB_SLOT * TOTAL_SLOTS, height: 56 }}
          >
            {/* capa del blob — filtrada, va detrás de los íconos.
                mismo ancho/contenedor que la fila de íconos a
                propósito, para que sus coordenadas calcen exacto. El
                hamburguesa queda afuera de este cálculo (nunca es
                índice válido de TABS), el blob nunca se mueve ahí. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ filter: "url(#tdf-tab-goo)" }}
            >
              <motion.div
                className="absolute top-1/2 w-10 h-10 rounded-full"
                style={{
                  marginTop: -20,
                  background:
                    "radial-gradient(circle, #C4147A 0%, #5B2A86 100%)",
                }}
                animate={{
                  left: activeIndex * TAB_SLOT + TAB_SLOT / 2 - 20,
                  scaleX: [1, 1.5, 1],
                }}
                transition={{
                  left: { type: "spring", stiffness: 300, damping: 22 },
                  scaleX: { duration: 0.35, ease: "easeOut" },
                }}
              />
            </div>

            {/* capa de íconos — nítida, sin filtro. 5 tabs + el
                hamburguesa al final, fuera del set que trackea el
                blob */}
            <div className="relative flex items-center">
              {TABS.map(({ key, Icon, label }) => (
                <button
                  key={key}
                  onClick={() => handleTabClick(key)}
                  aria-label={label}
                  className="flex items-center justify-center transition-colors"
                  style={{ width: TAB_SLOT, height: 56 }}
                >
                  <Icon
                    size={19}
                    className={
                      activeTab === key ? "text-white" : "text-tdf-muted"
                    }
                  />
                </button>
              ))}
              <button
                onClick={toggleMenu}
                aria-label="Más páginas"
                className="flex items-center justify-center transition-colors"
                style={{ width: TAB_SLOT, height: 56 }}
              >
                <Menu
                  size={19}
                  className={
                    openPanel === "menu" ? "text-white" : "text-tdf-muted"
                  }
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileBottomSheet
        open={openPanel === "actividad"}
        onClose={() => setOpenPanel(null)}
        title="Actividad"
      >
        <ActividadGridContent onNavigate={() => setOpenPanel(null)} />
      </MobileBottomSheet>

      <MobileBottomSheet
        open={openPanel === "perfil"}
        onClose={() => setOpenPanel(null)}
        title="Perfil"
      >
        <PerfilSheetContent onNavigate={() => setOpenPanel(null)} />
      </MobileBottomSheet>

      <MobileBottomSheet
        open={openPanel === "menu"}
        onClose={() => setOpenPanel(null)}
        title="Más páginas"
      >
        <MenuSheetContent onNavigate={() => setOpenPanel(null)} />
      </MobileBottomSheet>
    </>
  );
}
