import { AnimatePresence, motion } from "framer-motion";
import {
  Gamepad2,
  Home,
  Info,
  LayoutGrid,
  Radio,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { listCfnPlayers, listEvents, listTierLists } from "../lib/api";
import {
  ACTIVIDAD_LINKS,
  COMUNIDAD_LINKS,
  DIRECT_LINKS,
  JUGADORES_LINKS,
  SEARCHABLE_PAGES,
  SF6_LINKS,
} from "../lib/navLinks";
// umbral compartido — antes vivía duplicado a mano en dos archivos
// (acá y en el panel de chat de Twitch, ya sacado del sitio por
// ahora, ver lib/navbarMetrics.ts)
import { SCROLL_COMPACT_THRESHOLD } from "../lib/navbarMetrics";
import { useTwitchLiveStatus } from "../lib/useTwitchLiveStatus";
import type { CFNPlayer, EventItem, TierListSummaryData } from "../lib/types";
import LoginButton from "./LoginButton";
import MobileTabBar from "./MobileTabBar";
import NotificationBell from "./NotificationBell";

type NavDropdownLink = { to: string; label: string; Icon: typeof Home };

// mismas curvas/tiempos en todos los paneles del navbar, para que se
// sientan parte del mismo sistema en vez de animaciones sueltas cada
// una a su manera
const PANEL_TRANSITION = { duration: 0.18, ease: "easeOut" as const };

/** Link con ícono y una línea animada abajo — Framer Motion en vez de
 * CSS puro a pedido de Seba (21-08-2026): "le daría más vida a la
 * página que tenga efectos mejores". `compact` (13-09-2026, navbar
 * reactiva al scroll) esconde el texto y deja solo el ícono, para la
 * versión achicada de la barra. */
function AnimatedNavLink({
  to,
  label,
  Icon,
  compact,
  onClick,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="relative group py-2"
      title={compact ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <span
            className={`font-mono text-xs uppercase tracking-wide transition-colors flex items-center gap-1.5 ${
              isActive
                ? "text-tdf-magenta"
                : "text-tdf-muted group-hover:text-white"
            }`}
          >
            <Icon size={14} />
            {!compact && label}
          </span>
          <motion.span
            className="absolute left-0 -bottom-0.5 h-[2px] bg-tdf-magenta"
            initial={false}
            animate={{ width: isActive ? "100%" : "0%" }}
            whileHover={{ width: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        </>
      )}
    </NavLink>
  );
}

/** Desplegable por click, reutilizado para cualquier grupo del navbar
 * (Jugadores, Actividad, Comunidad, SF6). El posicionamiento absoluto
 * y el estilo hud-frame van en DOS divs separados a propósito — si
 * van en el mismo elemento, el `position: relative` que trae
 * hud-frame le termina ganando a `absolute` según el orden interno de
 * la hoja de estilos, y el panel queda desarmado (bug real encontrado
 * y arreglado 21-08-2026).
 *
 * `groupIcon` + `compact` (13-09-2026, navbar reactiva al scroll): en
 * la versión achicada de la barra el botón muestra solo groupIcon, sin
 * el nombre del grupo — el panel desplegado en sí SIEMPRE muestra el
 * texto completo de cada link, compact solo afecta al botón que lo
 * abre, no a las opciones de adentro (si no, no se podría ni leer qué
 * estás por elegir). */
function NavDropdown({
  label,
  groupIcon: GroupIcon,
  links,
  bordered = false,
  compact = false,
}: {
  label: string;
  groupIcon: typeof Home;
  links: NavDropdownLink[];
  bordered?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={compact ? label : undefined}
        className={`font-mono text-xs uppercase tracking-wide transition-colors flex items-center gap-1 ${
          bordered ? "border px-3 py-2" : ""
        } ${
          open
            ? bordered
              ? "border-tdf-magenta text-tdf-magenta"
              : "text-tdf-magenta"
            : bordered
              ? "border-tdf-line text-tdf-muted hover:border-tdf-magenta hover:text-white"
              : "text-tdf-muted hover:text-tdf-magenta"
        }`}
      >
        <GroupIcon size={14} />
        {!compact && label}
        <motion.span
          className="text-[9px]"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={PANEL_TRANSITION}
            className="absolute top-full left-0 mt-2 w-44 z-50"
          >
            <div className="hud-frame bg-tdf-charcoal border border-tdf-line py-1">
              {links.map(({ to, label: linkLabel, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase hover:text-tdf-magenta hover:bg-tdf-dark/60 transition-colors ${
                      isActive ? "text-tdf-magenta" : "text-tdf-muted"
                    }`
                  }
                >
                  <Icon size={14} />
                  {linkLabel}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Botón cuadrado con hover — mismo estilo para búsqueda y cualquier
 * otro ícono de acción que se agregue después. */
function IconButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`w-9 h-9 flex items-center justify-center border transition-colors duration-[250ms] ${
        active
          ? "border-tdf-magenta text-white bg-tdf-magenta/10"
          : "border-tdf-line text-tdf-muted hover:border-tdf-magenta hover:text-white hover:bg-tdf-magenta/10"
      }`}
    >
      {children}
    </motion.button>
  );
}

/** Búsqueda real, no simulada — filtra del lado del cliente sobre datos
 * que ya se pueden traer (listCfnPlayers/listEvents/listTierLists, las
 * tres ya existían para otras páginas). Con una comunidad de este
 * tamaño no hace falta un endpoint de búsqueda en el backend, sería
 * sobre-ingeniería (conversación de diseño, 21-08-2026). */
/** Búsqueda tipo "command palette" — antes era un dropdown chico
 * anclado al ícono de lupa, que se sentía poco natural (pedido de
 * Seba, 13-09-2026, con referencia visual de un buscador centrado
 * tipo Spotlight/Cmd+K). La lógica de filtrado es la misma de
 * siempre (client-side, ver comentario de 21-08-2026 sobre por qué),
 * lo que cambia es solo la presentación.
 *
 * Se saca del flujo normal del DOM con un Portal a `document.body` a
 * propósito: la barra principal es un `motion.div` animado (la
 * cápsula reactiva al scroll), y un overlay `fixed` adentro de un
 * ancestro con ciertas animaciones de Framer Motion puede terminar
 * fijo respecto a ESE ancestro en vez de la ventana completa, no a la
 * ventana — un Portal lo evita de raíz, sin tener que auditar cada
 * animación de los padres para confirmar que ninguna cree ese
 * problema. */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<CFNPlayer[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tierLists, setTierLists] = useState<TierListSummaryData[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
    listCfnPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]));
    listEvents(null)
      .then(setEvents)
      .catch(() => setEvents([]));
    listTierLists()
      .then(setTierLists)
      .catch(() => setTierLists([]));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const matchedPlayers =
    q.length < 2
      ? []
      : players
          .filter(
            (p) =>
              p.display_name.toLowerCase().includes(q) ||
              p.character_name?.toLowerCase().includes(q),
          )
          .slice(0, 5);
  const matchedEvents =
    q.length < 2
      ? []
      : events.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 5);
  const matchedTierLists =
    q.length < 2
      ? []
      : tierLists
          .filter(
            (t) =>
              t.template_name?.toLowerCase().includes(q) ||
              t.creator_name.toLowerCase().includes(q),
          )
          .slice(0, 5);
  const matchedPages =
    q.length < 2
      ? []
      : SEARCHABLE_PAGES.filter((p) => p.label.toLowerCase().includes(q));

  const hasResults =
    matchedPlayers.length > 0 ||
    matchedEvents.length > 0 ||
    matchedTierLists.length > 0 ||
    matchedPages.length > 0;

  function go(to: string) {
    navigate(to);
    onClose();
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center px-4 pt-[12vh]"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={PANEL_TRANSITION}
        className="hud-frame bg-tdf-charcoal border border-tdf-line w-full max-w-xl max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-tdf-line shrink-0">
          <Search size={18} className="text-tdf-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugadores, torneos, tier lists..."
            className="w-full bg-transparent text-base font-body outline-none placeholder:text-tdf-muted"
          />
          <kbd className="hidden sm:block font-mono text-[10px] text-tdf-muted border border-tdf-line px-1.5 py-0.5 rounded shrink-0">
            ESC
          </kbd>
        </div>

        <div className="overflow-y-auto p-3">
          {q.length < 2 && (
            <p className="font-body text-sm text-tdf-muted text-center py-10">
              Escribe al menos 2 letras para buscar.
            </p>
          )}

          {q.length >= 2 && !hasResults && (
            <p className="font-body text-sm text-tdf-muted text-center py-10">
              Sin resultados para "{query}".
            </p>
          )}

          {matchedPlayers.length > 0 && (
            <div className="mb-2">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 px-2 mt-2 mb-1">
                <Users size={11} /> Jugadores
              </p>
              {matchedPlayers.map((p) => (
                <button
                  key={p.cfn_id}
                  onClick={() => go(`/jugadores/${p.cfn_id}`)}
                  className="block w-full text-left px-3 py-2 rounded font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
                >
                  {p.display_name}
                  {p.character_name && (
                    <span className="text-xs opacity-70">
                      {" "}
                      · {p.character_name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {matchedEvents.length > 0 && (
            <div className="mb-2">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 px-2 mt-2 mb-1">
                <Trophy size={11} /> Torneos
              </p>
              {matchedEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => go("/torneos")}
                  className="block w-full text-left px-3 py-2 rounded font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
                >
                  {e.title}
                </button>
              ))}
            </div>
          )}

          {matchedTierLists.length > 0 && (
            <div className="mb-2">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 px-2 mt-2 mb-1">
                <LayoutGrid size={11} /> Tier Lists
              </p>
              {matchedTierLists.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go(`/tierlist/${t.id}`)}
                  className="block w-full text-left px-3 py-2 rounded font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
                >
                  {t.template_name ?? "Plantilla ya borrada"}
                  <span className="text-xs opacity-70">
                    {" "}
                    · por {t.creator_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {matchedPages.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 px-2 mt-2 mb-1">
                <Home size={11} /> Páginas
              </p>
              {matchedPages.map((p) => (
                <button
                  key={p.to}
                  onClick={() => go(p.to)}
                  className="block w-full text-left px-3 py-2 rounded font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const liveStatus = useTwitchLiveStatus();

  // navbar reactiva al scroll (pedido de Seba, 13-09-2026, referencias
  // de sitios modernos 2026: la barra arranca completa arriba de la
  // página y se achica a una cápsula compacta al bajar). De paso, esto
  // reemplaza la barra de aviso fija de arriba (sacada del todo — ya
  // pasó tiempo de sobra desde que se lanzó el aviso de Tier List) y
  // el viejo truco de "el logo cruza el borde entre dos barras", que
  // dejó de tener sentido sin una segunda barra que cruzar.
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > SCROLL_COMPACT_THRESHOLD);
    }
    handleScroll(); // por si la página ya carga scrolleada (ej. al volver con el botón atrás)
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header className="hidden md:block sticky top-0 z-40">
        <motion.div
          animate={{
            maxWidth: scrolled ? 880 : 1280,
            borderRadius: scrolled ? 9999 : 0,
            marginTop: scrolled ? 12 : 0,
            paddingLeft: scrolled ? 20 : 24,
            paddingRight: scrolled ? 20 : 24,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          // antes era justify-between con 3 grupos (logo, nav,
          // acciones) — eso reparte el espacio EN PARTES IGUALES
          // entre los tres, así que al achicarse la cápsula
          // (13-09-2026), el grupo de nav (chico, 4 íconos) quedaba
          // flotando solo en un hueco grande en el medio, en vez de
          // pegado al logo (bug real encontrado por Seba). Ahora
          // logo+nav quedan agrupados a la izquierda con gap normal,
          // y el `ml-auto` del div de acciones (más abajo) es lo que
          // empuja ESE grupo al extremo derecho — un solo elemento
          // "estirado", no los tres repartidos parejo.
          className="relative mx-auto flex items-center gap-4 bg-tdf-charcoal/90 backdrop-blur border border-tdf-line"
          style={{
            height: scrolled ? 56 : 64,
            boxShadow: scrolled
              ? "0 8px 30px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,20,122,0.15)"
              : "0 4px 30px -12px rgba(196,20,122,0.35)",
          }}
        >
          {/* logo integrado a la barra, ya no flotando arriba de un
            borde que no existe más — mismo criterio que la Dirección
            C conversada con Seba (13-09-2026), adaptado a la barra
            reactiva: se achica junto con el resto en vez de vivir
            aparte */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <motion.img
              src="/brand/logo-wordmark.webp"
              alt="TDF"
              animate={{ height: scrolled ? 28 : 36 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-auto"
              style={{
                filter:
                  "drop-shadow(0 0 5px rgba(196,20,122,0.85)) drop-shadow(0 0 12px rgba(196,20,122,0.4))",
              }}
            />
          </NavLink>

          <nav className="hidden md:flex items-center gap-6">
            {DIRECT_LINKS.map((link) => (
              <AnimatedNavLink key={link.to} {...link} compact={scrolled} />
            ))}
            <NavDropdown
              label="Jugadores"
              groupIcon={Users}
              links={JUGADORES_LINKS}
              compact={scrolled}
            />
            <NavDropdown
              label="Actividad"
              groupIcon={LayoutGrid}
              links={ACTIVIDAD_LINKS}
              compact={scrolled}
            />
            <NavDropdown
              label="Comunidad"
              groupIcon={Info}
              links={COMUNIDAD_LINKS}
              compact={scrolled}
            />
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0 ml-auto">
            <NavDropdown
              label="SF6"
              groupIcon={Gamepad2}
              links={SF6_LINKS}
              bordered
              compact={scrolled}
            />

            {liveStatus?.is_live ? (
              <motion.a
                href="https://www.twitch.tv/tdfedeportes"
                target="_blank"
                rel="noreferrer"
                title={scrolled ? "En vivo" : undefined}
                animate={{
                  boxShadow: [
                    "0 4px 20px -6px rgba(196,20,122,0.5)",
                    "0 4px 26px -4px rgba(196,20,122,0.85)",
                    "0 4px 20px -6px rgba(196,20,122,0.5)",
                  ],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase font-semibold text-white px-4 py-2.5"
                style={{
                  background: "linear-gradient(135deg, #C4147A, #5B2A86)",
                  clipPath:
                    "polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                }}
              >
                <Radio size={13} />
                {!scrolled && "En vivo"}
              </motion.a>
            ) : (
              <a
                href="https://www.twitch.tv/tdfedeportes"
                target="_blank"
                rel="noreferrer"
                title={scrolled ? "Ver stream" : undefined}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase text-tdf-muted border border-tdf-line hover:border-tdf-magenta hover:text-white transition-colors px-4 py-2.5"
              >
                <Radio size={13} />
                {!scrolled && "Ver stream"}
              </a>
            )}

            <div className="relative">
              <IconButton
                onClick={() => setSearchOpen((v) => !v)}
                active={searchOpen}
                label="Buscar"
              >
                <Search size={16} />
              </IconButton>
              <AnimatePresence>
                {searchOpen && (
                  <SearchPanel onClose={() => setSearchOpen(false)} />
                )}
              </AnimatePresence>
            </div>

            <NotificationBell />
            <LoginButton />
          </div>
        </motion.div>
      </header>

      <MobileTabBar />
    </>
  );
}
