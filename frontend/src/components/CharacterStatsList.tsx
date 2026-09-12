import { useEffect, useState } from "react";
import { getCharacterStats } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type { CharacterStats } from "../lib/types";
import Skeleton from "./Skeleton";

/** "También juega" — el pool completo de personajes que la persona
 * jugó alguna vez, con su win rate total y su Master Rate/tier PROPIO
 * de ese personaje (SF6 rankea por personaje, no por cuenta). A
 * diferencia del personaje "principal" que ya muestra el resto del
 * perfil, esto es la variedad real detrás de ese resumen. */
export default function CharacterStatsList({ cfnId }: { cfnId: string }) {
  const [stats, setStats] = useState<CharacterStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCharacterStats(cfnId)
      .then(setStats)
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [cfnId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  // nada que mostrar todavía (jugador recién trackeado, sin refresh
  // corrido) — mejor no mostrar la sección vacía que un hueco raro
  if (stats.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {stats.map((c) => (
        <div
          key={c.character_name}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span
            className={`font-semibold ${characterColorClass(c.character_name)}`}
          >
            {c.character_name}
          </span>
          <div className="flex items-center gap-3 font-mono text-[10px] text-tdf-muted shrink-0">
            {c.win_rate != null && (
              <span>{Math.round(c.win_rate * 100)}% WR</span>
            )}
            {c.master_rating != null ? (
              <span className="text-tdf-magenta">
                {c.master_rating} MR · {c.tier}
              </span>
            ) : (
              <span>Sin rango</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
