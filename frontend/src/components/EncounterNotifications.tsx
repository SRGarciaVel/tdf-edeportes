import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecentEncounters } from "../lib/api";
import type { EncounterData } from "../lib/types";

const POLL_MS = 3 * 60 * 1000; // cada 3 minutos alcanza — el cron que
// alimenta esto corre cada hora, no hace falta pollear más seguido

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

/** Avisa cuando dos jugadores trackeados por TDF se cruzaron en una
 * partida — el backend ya filtra a las últimas 48 horas y dedupea el par
 * (GET /cfn/encounters/recent), así que todo lo que llega acá se
 * muestra tal cual.
 *
 * `dismissed` NO se guarda en localStorage a propósito — cerrarlo dura
 * solo esta carga de página, vuelve a aparecer al recargar. Es un
 * término medio real entre dos necesidades: Seba necesita poder
 * sacarlo de encima durante stream (tapa la esquina al hacer zoom para
 * armar una tier list en vivo), pero tampoco queremos que alguien lo
 * cierre una vez y se pierda encuentros reales para siempre. */
export default function EncounterNotifications() {
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function load() {
      getRecentEncounters()
        .then((data) => {
          if (!cancelled) setEncounters(data);
        })
        .catch(() => {
          // silencioso a propósito — esto es un extra de ambientación,
          // no algo crítico que merezca un mensaje de error en pantalla
        });
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (encounters.length === 0 || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 max-w-[calc(100vw-2rem)]">
      <div className="hud-frame bg-tdf-charcoal border border-tdf-magenta/50 overflow-hidden">
        <div className="w-full flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex-1 min-w-0 flex items-center gap-2 text-left"
          >
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tdf-magenta opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-tdf-magenta" />
            </span>
            <span className="font-mono text-[11px] uppercase text-gray-300 flex-1">
              Se encontraron
            </span>
            <span className="font-mono text-[11px] bg-tdf-magenta/20 text-tdf-magenta px-1.5 py-0.5 rounded-full">
              {encounters.length}
            </span>
            <span className="text-tdf-muted text-xs">
              {collapsed ? "▲" : "▼"}
            </span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-tdf-muted hover:text-white transition-colors px-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {!collapsed && (
          <div className="border-t border-tdf-line max-h-64 overflow-y-auto">
            {encounters.map((e) => (
              <div
                key={`${e.player_a_cfn_id}-${e.player_b_cfn_id}-${e.played_at}`}
                className="flex items-center gap-2 px-3 py-2 border-b border-tdf-line last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 truncate">
                    <span className="text-white font-semibold">
                      {e.player_a_name}
                    </span>{" "}
                    <span className="text-tdf-muted">vs</span>{" "}
                    <span className="text-white font-semibold">
                      {e.player_b_name}
                    </span>
                  </p>
                  <p className="font-mono text-[10px] text-tdf-muted">
                    {timeAgo(e.played_at)}
                  </p>
                </div>
                <Link
                  to="/jugadores"
                  className="shrink-0 font-mono text-[10px] uppercase bg-tdf-magenta hover:bg-tdf-purple transition-colors text-white px-2 py-1"
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
