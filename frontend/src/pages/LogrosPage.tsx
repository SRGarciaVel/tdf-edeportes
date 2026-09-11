import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getAchievementsLeaderboard } from "../lib/api";
import type { AchievementLeaderboardEntry } from "../lib/types";

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
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="hud-frame bg-tdf-charcoal divide-y divide-tdf-line">
          {entries.map((e, i) => (
            <Link
              key={e.cfn_id}
              to={`/jugadores/${e.cfn_id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-tdf-dark/40 transition-colors"
            >
              <span className="font-mono text-sm text-tdf-muted w-6 text-right shrink-0">
                {i + 1}
              </span>
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-tdf-dark">
                {e.avatar_url ? (
                  <img
                    src={e.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <InitialsAvatar seed={e.display_name} size={8} />
                )}
              </div>
              <p className="text-sm font-semibold flex-1 truncate">
                {e.display_name}
              </p>
              {e.master_rating != null && (
                <span className="font-mono text-[10px] text-tdf-muted shrink-0">
                  {e.master_rating} MR
                </span>
              )}
              <span className="font-mono text-sm font-bold text-tdf-magenta shrink-0 w-16 text-right">
                {e.total_ap} AP
              </span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
