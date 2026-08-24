import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Gamepad2,
  Home,
  Info,
  LayoutGrid,
  Radio,
  Search,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { listCfnPlayers, listEvents, listTierLists } from "../lib/api";
import type { CFNPlayer, EventItem, TierListSummaryData } from "../lib/types";
import CommunityLinks from "./CommunityLinks";
import LoginButton from "./LoginButton";

// las más visitadas quedan sueltas y directas — el resto se agrupa en
// desplegables para no saturar la barra (conversación de diseño,
// 21-08-2026: 9 ítems sueltos era demasiado)
const DIRECT_LINKS = [
  { to: "/", label: "Inicio", Icon: Home },
  { to: "/calendario", label: "Calendario", Icon: Calendar },
  { to: "/jugadores", label: "Jugadores", Icon: Users },
];

const COMUNIDAD_LINKS = [
  { to: "/torneos", label: "Torneos", Icon: Trophy },
  { to: "/objetivos", label: "Objetivos", Icon: Target },
  { to: "/nosotros", label: "Nosotros", Icon: Info },
  { to: "/puntos", label: "Puntos", Icon: Star },
  { to: "/tierlist", label: "Tier List", Icon: LayoutGrid },
];

const SF6_LINKS = [{ to: "/sf6/meta", label: "Meta actual", Icon: Gamepad2 }];

// para el buscador de "Páginas" — destinos fijos del sitio, no datos
// que haya que traer de ningún lado (ver SearchPanel más abajo)
const SEARCHABLE_PAGES = [...DIRECT_LINKS, ...COMUNIDAD_LINKS, ...SF6_LINKS];

type NavDropdownLink = { to: string; label: string; Icon: typeof Home };

// mismas curvas/tiempos en todos los paneles del navbar, para que se
// sientan parte del mismo sistema en vez de animaciones sueltas cada
// una a su manera
const PANEL_TRANSITION = { duration: 0.18, ease: "easeOut" as const };

/** Link con ícono y una línea animada abajo — Framer Motion en vez de
 * CSS puro a pedido de Seba (21-08-2026): "le daría más vida a la
 * página que tenga efectos mejores". */
function AnimatedNavLink({
  to,
  label,
  Icon,
  onClick,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  onClick?: () => void;
}) {
  return (
    <NavLink to={to} onClick={onClick} className="relative group py-2">
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
            {label}
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
 * (Comunidad, SF6). El posicionamiento absoluto y el estilo hud-frame
 * van en DOS divs separados a propósito — si van en el mismo elemento,
 * el `position: relative` que trae hud-frame le termina ganando a
 * `absolute` según el orden interno de la hoja de estilos, y el panel
 * queda desarmado (bug real encontrado y arreglado 21-08-2026). */
function NavDropdown({
  label,
  links,
  bordered = false,
}: {
  label: string;
  links: NavDropdownLink[];
  bordered?: boolean;
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
        {label}
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
function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
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
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={PANEL_TRANSITION}
      className="absolute top-full right-0 mt-2 w-80 z-50"
    >
      <div className="hud-frame bg-tdf-charcoal border border-tdf-line p-3">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugadores, torneos, tier lists..."
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-body mb-2"
        />

        {q.length >= 2 && !hasResults && (
          <p className="font-body text-xs text-tdf-muted py-2">
            Sin resultados para "{query}".
          </p>
        )}

        {matchedPlayers.length > 0 && (
          <div className="mb-2">
            <p className="font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 mt-2 mb-1">
              Jugadores
            </p>
            {matchedPlayers.map((p) => (
              <button
                key={p.cfn_id}
                onClick={() => go("/jugadores")}
                className="block w-full text-left px-2 py-1.5 font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
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
            <p className="font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 mt-2 mb-1">
              Torneos
            </p>
            {matchedEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => go("/torneos")}
                className="block w-full text-left px-2 py-1.5 font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
              >
                {e.title}
              </button>
            ))}
          </div>
        )}

        {matchedTierLists.length > 0 && (
          <div className="mb-2">
            <p className="font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 mt-2 mb-1">
              Tier Lists
            </p>
            {matchedTierLists.map((t) => (
              <button
                key={t.id}
                onClick={() => go(`/tierlist/${t.id}`)}
                className="block w-full text-left px-2 py-1.5 font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
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
            <p className="font-mono text-[9px] uppercase tracking-wider text-tdf-muted opacity-70 mt-2 mb-1">
              Páginas
            </p>
            {matchedPages.map((p) => (
              <button
                key={p.to}
                onClick={() => go(p.to)}
                className="block w-full text-left px-2 py-1.5 font-body text-sm text-tdf-muted hover:text-white hover:bg-tdf-magenta/10 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 bg-tdf-charcoal/85 backdrop-blur"
      style={{
        borderBottom: "1px solid rgba(196,20,122,0.25)",
        boxShadow: "0 4px 30px -12px rgba(196,20,122,0.35)",
      }}
    >
      {/* barra superior angosta — antes era el AnnouncementBar suelto
          solo en Home, ahora vive fusionado acá arriba y se ve en todo
          el sitio (conversación de diseño, 21-08-2026). Sin botón de
          cerrar a propósito: un click sin querer lo perdía para
          siempre en ese navegador sin forma de recuperarlo (bug real
          encontrado por Seba el mismo día que se lanzó esto). */}
      <div className="h-8 border-b border-tdf-line flex items-center justify-between px-4 sm:px-6 font-mono text-[11px]">
        <p className="text-tdf-muted truncate flex items-center gap-1.5 min-w-0">
          <span
            className="relative flex h-1.5 w-1.5 shrink-0"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tdf-magenta opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-tdf-magenta" />
          </span>
          <span className="hidden sm:inline">NUEVO:</span>
          <span className="truncate">
            Ya puedes armar tu Tier List de personajes con la comunidad.
          </span>
          <NavLink
            to="/tierlist"
            className="text-tdf-magenta hover:text-white underline shrink-0"
          >
            Probarla →
          </NavLink>
        </p>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <CommunityLinks className="hidden sm:flex" />
        </div>
      </div>

      {/* barra principal — el logo "atraviesa" el borde entre las dos
          barras, mismo truco visual que se probó en el teaser, con la
          esquina cortada de siempre en vez de un óvalo genérico */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="absolute left-1/2 -top-6 -translate-x-1/2 z-10 hidden md:flex">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="relative w-20 h-20 flex items-center justify-center bg-tdf-charcoal border border-tdf-line hud-frame"
          >
            <div
              className="absolute -inset-5 -z-10"
              style={{
                background:
                  "radial-gradient(circle, rgba(196,20,122,0.4) 0%, transparent 70%)",
              }}
            />
            <NavLink to="/">
              <img
                src="/brand/logo-wordmark.webp"
                alt="TDF"
                className="w-14 h-auto"
                style={{
                  filter:
                    "drop-shadow(0 0 6px rgba(196,20,122,0.9)) drop-shadow(0 0 16px rgba(196,20,122,0.5))",
                }}
              />
            </NavLink>
          </motion.div>
        </div>

        <NavLink to="/" className="flex items-center gap-2 shrink-0 md:hidden">
          <img
            src="/brand/logo-wordmark.webp"
            alt="TDF"
            className="h-7 w-auto"
          />
        </NavLink>

        <nav className="hidden md:flex items-center gap-6">
          {DIRECT_LINKS.map((link) => (
            <AnimatedNavLink key={link.to} {...link} />
          ))}
          <NavDropdown label="Comunidad" links={COMUNIDAD_LINKS} />
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <NavDropdown label="SF6" links={SF6_LINKS} bordered />

          <motion.a
            href="https://www.twitch.tv/tdfedeportes"
            target="_blank"
            rel="noreferrer"
            animate={{
              boxShadow: [
                "0 4px 20px -6px rgba(196,20,122,0.5)",
                "0 4px 26px -4px rgba(196,20,122,0.85)",
                "0 4px 20px -6px rgba(196,20,122,0.5)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
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
            Ver stream
          </motion.a>

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

          <LoginButton />
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* drawer mobile — logo centrado, menú completo, y las mismas
          acciones de la barra de escritorio abajo del todo */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden border-t border-tdf-line overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-4 font-mono text-sm uppercase">
              {DIRECT_LINKS.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${isActive ? "text-tdf-magenta" : "text-tdf-muted"}`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
              <div className="pt-2 border-t border-tdf-line">
                <p className="text-tdf-muted mb-2">Comunidad</p>
                {COMUNIDAD_LINKS.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 pl-3 py-1 ${isActive ? "text-tdf-magenta" : "text-tdf-muted"}`
                    }
                  >
                    <Icon size={14} />
                    {label}
                  </NavLink>
                ))}
              </div>
              <div className="pt-2 border-t border-tdf-line">
                <p className="text-tdf-muted mb-2">SF6</p>
                {SF6_LINKS.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 pl-3 py-1 ${isActive ? "text-tdf-magenta" : "text-tdf-muted"}`
                    }
                  >
                    <Icon size={14} />
                    {label}
                  </NavLink>
                ))}
              </div>
              <a
                href="https://www.twitch.tv/tdfedeportes"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-tdf-muted"
              >
                <Radio size={14} />
                Ver stream ↗
              </a>
              <div className="pt-2 border-t border-tdf-line flex flex-col gap-3">
                <CommunityLinks />
                <LoginButton />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
