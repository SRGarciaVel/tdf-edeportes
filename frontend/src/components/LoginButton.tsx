import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { getTwitchLoginUrl } from "../lib/api";
import { useAuth } from "../lib/auth";

const PANEL_TRANSITION = { duration: 0.18, ease: "easeOut" as const };

const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase hover:text-tdf-magenta hover:bg-tdf-dark/60 transition-colors ${
    isActive ? "text-tdf-magenta" : "text-tdf-muted"
  }`;

/** El menú de usuario logueado — antes era una fila plana (avatar,
 * nombre, badge Staff, "Salir" siempre visible). A pedido de Seba
 * (28-08-2026), ahora el nombre/avatar es el disparador de un
 * desplegable (mismo patrón visual que NavDropdown en Navbar.tsx: dos
 * divs separados para el hud-frame + posicionamiento absoluto, ver el
 * comentario grande ahí sobre por qué van separados) con el acceso a
 * "Mi perfil" (la página nueva de auto-edición) y "Salir" adentro.
 *
 * `variant="inline"` se usa en el menú mobile (que ya es una lista
 * vertical siempre expandida, sin desplegables — mismo criterio que
 * Comunidad/SF6 ahí, ver Navbar.tsx): en ese caso no hay click que
 * abrir, el nombre/avatar y las dos opciones se muestran siempre. */
export default function LoginButton({
  variant = "dropdown",
}: {
  variant?: "dropdown" | "inline";
}) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "dropdown") return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  async function handleLogin() {
    const { authorize_url } = await getTwitchLoginUrl();
    window.location.href = authorize_url;
  }

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="bg-tdf-purple hover:bg-tdf-magenta transition-colors text-white text-sm font-semibold px-4 py-2 rounded"
      >
        Entrar con Twitch
      </button>
    );
  }

  const identityRow = (
    <>
      {user.avatar_url && (
        <img
          src={user.avatar_url}
          alt={user.display_name}
          className="w-8 h-8 rounded-full border-2 border-tdf-magenta shrink-0"
          style={{ boxShadow: "0 0 8px rgba(196,20,122,0.5)" }}
        />
      )}
      <span className="text-sm">{user.display_name}</span>
      {user.is_staff && (
        <span className="text-xs bg-tdf-magenta/20 text-tdf-magenta px-2 py-0.5 rounded">
          Staff
        </span>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">{identityRow}</div>
        <div className="flex flex-col">
          <NavLink to="/perfil" className={menuLinkClass}>
            <User size={14} /> Mi perfil
          </NavLink>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase text-tdf-muted hover:text-white text-left"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2"
      >
        {identityRow}
        <ChevronDown
          size={14}
          className={`text-tdf-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={PANEL_TRANSITION}
            className="absolute top-full right-0 mt-2 w-44 z-50"
          >
            <div className="hud-frame bg-tdf-charcoal border border-tdf-line py-1">
              <NavLink
                to="/perfil"
                onClick={() => setOpen(false)}
                className={menuLinkClass}
              >
                <User size={14} /> Mi perfil
              </NavLink>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase text-tdf-muted hover:text-white hover:bg-tdf-dark/60 transition-colors text-left"
              >
                <LogOut size={14} /> Salir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
