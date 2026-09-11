import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayerAchievements } from "../lib/api";
import type { Achievement, PlayerAchievements } from "../lib/types";
import Skeleton from "./Skeleton";

// mismo criterio de color semántico que ya usa FodaQuadrants — cada
// rareza con su propio color, del sistema de 4 niveles conversado con
// Seba (06-09-2026): raza (verde) < ansatsuken (celeste) <
// psycho_power (púrpura) < satsui no hado (rojo)
const RARITY_STYLES: Record<
  Achievement["rarity"],
  { label: string; border: string; bg: string; text: string }
> = {
  raza: {
    label: "Raza",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/[0.06]",
    text: "text-emerald-400",
  },
  ansatsuken: {
    label: "Ansatsuken",
    border: "border-sky-500/40",
    bg: "bg-sky-500/[0.06]",
    text: "text-sky-400",
  },
  psycho_power: {
    label: "Psycho Power",
    border: "border-purple-500/40",
    bg: "bg-purple-500/[0.06]",
    text: "text-purple-400",
  },
  satsui_no_hado: {
    label: "Satsui no Hado",
    border: "border-red-500/40",
    bg: "bg-red-500/[0.06]",
    text: "text-red-400",
  },
};

/** Logros de un jugador — se calculan en vivo en el backend (nunca un
 * "listo desde tal fecha" guardado, ver compute_achievements), así que
 * reflejan el estado real actual, no una foto congelada del día que
 * se cumplió la condición. */
export default function AchievementsPanel({ cfnId }: { cfnId: string }) {
  const [data, setData] = useState<PlayerAchievements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlayerAchievements(cfnId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cfnId]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <p className="font-mono text-[10px] text-tdf-muted">
        No se pudieron cargar los logros.
      </p>
    );
  }

  const unlockedCount = data.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] uppercase text-tdf-muted">
        {unlockedCount}/{data.achievements.length} desbloqueados ·{" "}
        <span className="text-white">{data.total_ap} AP</span>
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {data.achievements.map((a) => {
          const style = RARITY_STYLES[a.rarity];
          return (
            <div
              key={a.id}
              className={`border rounded px-3 py-2.5 flex flex-col gap-1 ${
                a.unlocked
                  ? `${style.border} ${style.bg}`
                  : "border-tdf-line bg-tdf-dark/40 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`font-mono text-[9px] uppercase ${a.unlocked ? style.text : "text-tdf-muted"}`}
                >
                  {style.label} · {a.ap} AP
                </p>
                {!a.unlocked && <Lock size={11} className="text-tdf-muted" />}
              </div>
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="font-body text-xs text-tdf-muted">
                {a.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
