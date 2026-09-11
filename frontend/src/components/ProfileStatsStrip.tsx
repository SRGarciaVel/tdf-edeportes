import type { CFNPlayer } from "../lib/types";

/** Franja de stats debajo del banner/avatar del perfil — pedido de
 * Seba (06-09-2026), inspirado en el patrón de Growly (un resumen
 * rápido de 3 números antes de bajar a leer el resto). Usa el
 * historial COMPLETO trackeado (total_matches_all_time), no una
 * ventana de días como el resto de las stats de partidas del sitio. */
export default function ProfileStatsStrip({ player }: { player: CFNPlayer }) {
  const winRatePct =
    player.win_rate_all_time != null
      ? Math.round(player.win_rate_all_time * 100)
      : null;
  const memberSince = new Date(player.member_since).toLocaleDateString(
    "es-CL",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="grid grid-cols-3 divide-x divide-tdf-line hud-frame bg-tdf-charcoal">
      <div className="px-3 py-3 text-center">
        <p className="text-xl font-display font-bold">
          {player.total_matches_all_time}
        </p>
        <p className="font-mono text-[9px] uppercase text-tdf-muted">
          Partidas trackeadas
        </p>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-xl font-display font-bold">
          {winRatePct != null ? `${winRatePct}%` : "N/D"}
        </p>
        <p className="font-mono text-[9px] uppercase text-tdf-muted">
          Win rate
        </p>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-sm font-display font-bold capitalize leading-tight mt-1">
          {memberSince}
        </p>
        <p className="font-mono text-[9px] uppercase text-tdf-muted">
          Miembro desde
        </p>
      </div>
    </div>
  );
}
