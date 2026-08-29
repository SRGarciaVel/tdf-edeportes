import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "./InitialsAvatar";
import { useAuth } from "../lib/auth";
import { useNotifications } from "../lib/useNotifications";

const PANEL_TRANSITION = { duration: 0.18, ease: "easeOut" as const };

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

/** Campanita de notificaciones — a propósito un ícono SEPARADO del
 * avatar/nombre (no adentro del mismo botón que abre "Mi perfil" /
 * "Salir"), para que tocarla no dispare ese otro desplegable. Va antes
 * del avatar en la navbar, mismo lugar que en el "About" de Twitch que
 * mandó Seba de referencia (29-08-2026). Extensible a más tipos de
 * notificación además de "comment_received" — item_unknown queda como
 * fallback genérico para cuando se agregue un tipo nuevo del lado del
 * backend antes que acá. */
export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead } = useNotifications(
    token ?? null,
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!token) return null;

  function handleToggle() {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) markAllRead();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notificaciones"
        className="relative flex items-center justify-center w-8 h-8 text-tdf-muted hover:text-white transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-1 rounded-full bg-tdf-magenta text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={PANEL_TRANSITION}
            className="absolute top-full right-0 mt-2 w-72 z-50"
          >
            <div className="hud-frame bg-tdf-charcoal border border-tdf-line py-1 max-h-80 overflow-y-auto">
              <p className="font-mono text-[10px] uppercase text-tdf-muted px-3 py-2 border-b border-tdf-line">
                Notificaciones
              </p>
              {notifications.length === 0 && (
                <p className="font-mono text-[10px] text-tdf-muted px-3 py-4 text-center">
                  Nada por acá todavía.
                </p>
              )}
              {notifications.map((n) => {
                if (n.type === "comment_received") {
                  const authorName = String(
                    n.payload.author_display_name ?? "",
                  );
                  const authorAvatar = n.payload.author_avatar_url as
                    string | null;
                  const preview = String(n.payload.body_preview ?? "");
                  return (
                    <Link
                      key={n.id}
                      to="/perfil"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-tdf-dark/60 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-tdf-dark">
                        {authorAvatar ? (
                          <img
                            src={authorAvatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <InitialsAvatar seed={authorName} size={7} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs">
                          <span className="font-semibold">{authorName}</span>{" "}
                          <span className="text-tdf-muted">
                            comentó tu perfil
                          </span>
                        </p>
                        <p className="text-xs text-tdf-muted truncate">
                          "{preview}"
                        </p>
                        <p className="font-mono text-[9px] text-tdf-muted mt-0.5">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                    </Link>
                  );
                }
                // fallback genérico para tipos futuros que el
                // frontend todavía no sabe renderizar en detalle
                return (
                  <div key={n.id} className="px-3 py-2.5">
                    <p className="text-xs text-tdf-muted">
                      Tienes una notificación nueva.
                    </p>
                    <p className="font-mono text-[9px] text-tdf-muted mt-0.5">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
