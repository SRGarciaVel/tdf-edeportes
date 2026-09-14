import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Medal } from "lucide-react";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getAchievementsLeaderboard } from "../lib/api";
import type { AchievementLeaderboardEntry } from "../lib/types";

// oro / plata / bronce — solo para el podio (rank 1-3), el resto usa
// el número liso de siempre
const PODIUM_STYLES: Record<number, { text: string; ring: string }> = {
  1: { text: "text-amber-400", ring: "ring-amber-400/50" },
  2: { text: "text-slate-300", ring: "ring-slate-300/40" },
  3: { text: "text-orange-700", ring: "ring-orange-700/50" },
};

function LeaderboardRow({
  entry,
  rank,
  maxAp,
}: {
  entry: AchievementLeaderboardEntry;
  rank: number;
  maxAp: number;
}) {
  const podium = PODIUM_STYLES[rank];
  // ancho de la barra relativo al puntaje más alto del roster — da
  // sentido de escala real, no solo el número suelto (pedido de Seba,
  // 13-09-2026: "muy simple y poco legible")
  const barWidth = maxAp > 0 ? Math.max(4, (entry.total_ap / maxAp) * 100) : 0;

  return (
    <Link
      to={`/jugadores/${entry.cfn_id}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-tdf-dark/40 transition-colors"
    >
      <div className="w-7 shrink-0 flex justify-center">
        {podium ? (
          <Medal size={20} className={podium.text} />
        ) : (
          <span className="font-mono text-sm text-tdf-muted">{rank}</span>
        )}
      </div>

      <div
        className={`rounded-full overflow-hidden shrink-0 bg-tdf-dark ${
          podium ? `w-11 h-11 ring-2 ${podium.ring}` : "w-9 h-9"
        }`}
      >
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <InitialsAvatar seed={entry.display_name} size={podium ? 11 : 9} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`truncate ${podium ? `font-semibold ${podium.text}` : "text-sm font-semibold"}`}
        >
          {entry.display_name}
        </p>
        <div className="h-1 bg-tdf-line rounded-full overflow-hidden mt-1.5 max-w-[240px]">
          <div
            className="h-full bg-tdf-magenta rounded-full"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {entry.master_rating != null && (
        <span className="font-mono text-[10px] text-tdf-muted shrink-0 hidden sm:inline">
          {entry.master_rating} MR
        </span>
      )}
      <span className="font-mono text-sm font-bold text-tdf-magenta shrink-0 w-16 text-right">
        {entry.total_ap} AP
      </span>
    </Link>
  );
}

/** Leaderboard de logros — orden por AP, empate se resuelve por MR más
 * alto (mismo criterio que el backend, ver
 * get_achievements_leaderboard). Público, sin auth. */
export default function LogrosPage() {
  const [entries, setEntries] = useState<AchievementLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAchievementsLeaderboard()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const maxAp = entries[0]?.total_ap ?? 0;

  return (
    <Layout>
      <SectionLabel index="01">Logros</SectionLabel>
      <p className="text-tdf-muted font-body text-sm mb-6 max-w-2xl">
        Puntaje de logros (AP) de todo el roster de TDF. Se calcula en vivo
        según el estado real de cada jugador, no queda congelado en el día que
        se logró.
      </p>

      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="hud-frame bg-tdf-charcoal divide-y divide-tdf-line">
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.cfn_id}
              entry={entry}
              rank={i + 1}
              maxAp={maxAp}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
