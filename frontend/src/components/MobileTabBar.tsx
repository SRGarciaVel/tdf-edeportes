import { motion } from "framer-motion";
import { Calendar, Home, Info, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import MobileBottomSheet from "./MobileBottomSheet";
import LoginButton from "./LoginButton";
import NotificationBell from "./NotificationBell";
import { listCfnPlayers } from "../lib/api";
import {
  ACTIVIDAD_LINKS,
  COMUNIDAD_LINKS,
  JUGADORES_LINKS,
  SF6_LINKS,
} from "../lib/navLinks";
import type { CFNPlayer } from "../lib/types";

// mismo orden que se dibujan los 5 íconos — el blob liquid usa este
// índice para saber a qué posición moverse
const TABS = [
  { key: "inicio", Icon: Home, label: "Inicio" },
  { key: "jugadores", Icon: Users, label: "Jugadores" },
  { key: "actividad", Icon: Calendar, label: "Actividad" },
  { key: "comunidad", Icon: Info, label: "Comunidad" },
  { key: "perfil", Icon: User, label: "Perfil" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function activeTabFromPath(pathname: string): TabKey {
  if (
    JUGADORES_LINKS.some((l) => pathname.startsWith(l.to)) ||
    pathname.startsWith("/jugadores/")
  )
    return "jugadores";
  if (ACTIVIDAD_LINKS.some((l) => pathname.startsWith(l.to)))
    return "actividad";
  if (COMUNIDAD_LINKS.some((l) => pathname.startsWith(l.to)))
    return "comunidad";
  if (pathname.startsWith("/perfil") || pathname.startsWith("/admin"))
    return "perfil";
  return "inicio";
}

const TAB_SLOT = 56; // px por ícono, el blob se mueve en múltiplos de esto

function LinkList({
  links,
  onNavigate,
}: {
  links: { to: string; label: string }[];
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `px-3 py-2.5 rounded font-mono text-xs uppercase ${
              isActive
                ? "text-tdf-magenta bg-tdf-magenta/10"
                : "text-tdf-muted hover:bg-tdf-dark/60"
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </div>
  );
}

/** Panel de "Perfil" — junta todo lo que en desktop vive suelto en la
 * barra (login, notificaciones, SF6) más un buscador simplificado.
 * Pedido explícito de Seba (13-09-2026): en mobile, la tab bar de
 * abajo es lo único fijo, todo lo demás vive acá adentro. */
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
 * Reemplaza al menú hamburguesa de arriba por completo: acá vive TODA
 * la navegación mobile. El efecto liquid es el truco clásico de SVG
 * (blur fuerte + feColorMatrix que sube el contraste de la
 * transparencia) aplicado SOLO a la capa del blob — los íconos van en
 * una capa separada sin el filtro, encima, para que se vean nítidos. */
export default function MobileTabBar() {
  const location = useLocation();
  const [openSheet, setOpenSheet] = useState<TabKey | null>(null);

  const activeTab = activeTabFromPath(location.pathname);
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  function handleTabClick(key: TabKey) {
    if (key === "inicio") {
      setOpenSheet(null);
      return;
    }
    setOpenSheet((current) => (current === key ? null : key));
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
        className="fixed bottom-4 inset-x-4 z-40 md:hidden mx-auto max-w-xs bg-tdf-charcoal/95 backdrop-blur border border-tdf-line rounded-full"
        style={{
          boxShadow: "0 8px 30px -8px rgba(0,0,0,0.7)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="relative h-14 flex items-center justify-center">
          <div
            className="relative"
            style={{ width: TAB_SLOT * TABS.length, height: 56 }}
          >
            {/* capa del blob — filtrada, va detrás de los íconos.
                mismo ancho/contenedor que la fila de íconos a
                propósito, para que sus coordenadas calcen exacto (si
                viven en contenedores de ancho distinto, el blob queda
                desalineado de los íconos reales) */}
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

            {/* capa de íconos — nítida, sin filtro */}
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
            </div>
          </div>
        </div>
      </nav>

      <MobileBottomSheet
        open={openSheet === "jugadores"}
        onClose={() => setOpenSheet(null)}
        title="Jugadores"
      >
        <LinkList
          links={JUGADORES_LINKS}
          onNavigate={() => setOpenSheet(null)}
        />
      </MobileBottomSheet>

      <MobileBottomSheet
        open={openSheet === "actividad"}
        onClose={() => setOpenSheet(null)}
        title="Actividad"
      >
        <LinkList
          links={ACTIVIDAD_LINKS}
          onNavigate={() => setOpenSheet(null)}
        />
      </MobileBottomSheet>

      <MobileBottomSheet
        open={openSheet === "comunidad"}
        onClose={() => setOpenSheet(null)}
        title="Comunidad"
      >
        <LinkList
          links={COMUNIDAD_LINKS}
          onNavigate={() => setOpenSheet(null)}
        />
      </MobileBottomSheet>

      <MobileBottomSheet
        open={openSheet === "perfil"}
        onClose={() => setOpenSheet(null)}
        title="Perfil"
      >
        <PerfilSheetContent onNavigate={() => setOpenSheet(null)} />
      </MobileBottomSheet>
    </>
  );
}
