import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import CommunityLinks from "./CommunityLinks";
import LoginButton from "./LoginButton";

const LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/calendario", label: "Calendario" },
  { to: "/torneos", label: "Torneos" },
  { to: "/jugadores", label: "Jugadores" },
  { to: "/objetivos", label: "Objetivos" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/puntos", label: "Puntos" },
  { to: "/tierlist", label: "Tier List" },
];

// contenido genérico del juego (no de TDF como club) — separado del
// resto porque conceptualmente es otra cosa: referencia sobre SF6, no
// sobre el club (conversación de diseño, 20-08-2026). Solo un ítem por
// ahora — notas de parche queda afuera hasta que se defina el enfoque.
const SF6_LINKS = [{ to: "/sf6/meta", label: "Meta actual" }];

/** Desplegable por hover/click — primer patrón de este tipo en el sitio,
 * no había ninguno armado todavía. Se cierra solo al clickear afuera. */
function Sf6Dropdown() {
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
        className={`hover:text-tdf-magenta transition-colors flex items-center gap-1 ${
          open ? "text-tdf-magenta" : "text-tdf-muted"
        }`}
      >
        SF6
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-44 z-50">
          <div className="hud-frame bg-tdf-charcoal border border-tdf-line py-1">
            {SF6_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 hover:text-tdf-magenta hover:bg-tdf-dark/60 transition-colors ${
                    isActive ? "text-tdf-magenta" : "text-tdf-muted"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-tdf-line bg-tdf-charcoal/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/brand/logo-wordmark.webp"
            alt="TDF"
            className="h-7 w-auto"
          />
          <span className="text-white/60 text-sm font-mono">e-deportes</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-5 font-mono text-xs uppercase tracking-wide">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `hover:text-tdf-magenta transition-colors ${
                  isActive ? "text-tdf-magenta" : "text-tdf-muted"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <Sf6Dropdown />
        </nav>

        <div className="hidden md:flex items-center gap-5 shrink-0">
          <CommunityLinks />
          <LoginButton />
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-tdf-line px-4 py-4 flex flex-col gap-4 font-mono text-sm uppercase">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? "text-tdf-magenta" : "text-tdf-muted"
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-tdf-line">
            <p className="text-tdf-muted mb-2">SF6</p>
            {SF6_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block pl-3 py-1 ${isActive ? "text-tdf-magenta" : "text-tdf-muted"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="pt-2 border-t border-tdf-line flex flex-col gap-3">
            <CommunityLinks />
            <LoginButton />
          </div>
        </nav>
      )}
    </header>
  );
}
