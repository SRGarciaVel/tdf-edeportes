import { useState } from "react";
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
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-tdf-line bg-tdf-charcoal/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="text-xl font-graffiti text-tdf-magenta tracking-wider">
          TDF <span className="text-white/60 text-sm font-mono font-normal">e-deportes</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-6 font-mono text-xs uppercase tracking-wider">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `hover:text-tdf-magenta transition-colors ${
                  isActive ? "text-tdf-magenta" : "text-gray-400"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
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
                isActive ? "text-tdf-magenta" : "text-gray-400"
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-tdf-line flex flex-col gap-3">
            <CommunityLinks />
            <LoginButton />
          </div>
        </nav>
      )}
    </header>
  );
}
