import { Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getSfPersonalityStats } from "../lib/api";
import { getCharacterImage } from "../lib/characterImages";
import { FAMILY_LABELS } from "../lib/personalityFamilies";
import type { SFCharacterStat, SFStatsResponse } from "../lib/types";

// oro / plata / bronce -- mismo patrón que el leaderboard de Logros
// (LogrosPage.tsx), reusado acá para no inventar un lenguaje visual
// nuevo para lo mismo (podio de un ranking)
const PODIUM_STYLES: Record<number, { text: string; ring: string }> = {
  1: { text: "text-amber-400", ring: "ring-amber-400/50" },
  2: { text: "text-slate-300", ring: "ring-slate-300/40" },
  3: { text: "text-orange-700", ring: "ring-orange-700/50" },
};

function RankingRow({
  entry,
  rank,
  failedImages,
  onImageError,
}: {
  entry: SFCharacterStat;
  rank: number;
  failedImages: Set<string>;
  onImageError: (name: string) => void;
}) {
  const podium = PODIUM_STYLES[rank];
  const image = getCharacterImage(entry.character_name);
  const showImage = image && !failedImages.has(entry.character_name);

  return (
    <div
      className={`hud-frame bg-tdf-charcoal border p-3.5 flex items-center gap-4 ${
        podium ? "border-tdf-magenta" : "border-tdf-line"
      }`}
    >
      <div className="w-7 shrink-0 flex justify-center">
        {podium ? (
          <Medal size={20} className={podium.text} />
        ) : (
          <span className="font-mono text-sm text-tdf-muted">{rank}</span>
        )}
      </div>

      <div
        className={`shrink-0 overflow-hidden bg-tdf-dark flex items-center justify-center ${
          podium ? `w-14 h-14 ring-2 ${podium.ring}` : "w-10 h-10"
        }`}
      >
        {showImage ? (
          <img
            src={image ?? undefined}
            alt=""
            onError={() => onImageError(entry.character_name)}
            className="w-full h-full object-cover"
          />
        ) : (
          <InitialsAvatar seed={entry.character_name} size={podium ? 14 : 10} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`truncate ${podium ? `font-semibold ${podium.text}` : "text-sm font-semibold"}`}
        >
          {entry.character_name}
        </p>
        {entry.family_key && FAMILY_LABELS[entry.family_key] && (
          <p className="font-mono text-[10px] uppercase text-tdf-muted truncate">
            {FAMILY_LABELS[entry.family_key]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="w-12 sm:w-24 h-1.5 bg-tdf-line overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-tdf-magenta to-tdf-purple"
            style={{ width: `${entry.percentage}%` }}
          />
        </div>
        <span className="font-mono text-xs text-tdf-muted w-12 text-right">
          {entry.percentage}%
        </span>
      </div>
    </div>
  );
}

/** Ranking de resultados del test de personalidad SF -- solo cuenta a
 * quienes hicieron el test logueados (ver SFPersonalityResult en el
 * backend), así que el total puede ser más chico que la cantidad real
 * de gente que probó el test como invitado. */
export default function PersonalityRankingPage() {
  const [stats, setStats] = useState<SFStatsResponse | null>(null);
  const [error, setError] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    getSfPersonalityStats()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  function handleImageError(name: string) {
    setFailedImages((prev) => new Set(prev).add(name));
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <SectionLabel index="01">Test de personalidad SF</SectionLabel>
        <h1 className="font-display font-bold uppercase text-3xl mb-2">
          Ranking de la comunidad
        </h1>
        <p className="text-tdf-muted font-body mb-8">
          Qué personaje sacó cada quien en TDF, ordenado de más a menos
          repetido.
        </p>

        {error && (
          <p className="text-tdf-muted font-body">
            No se pudo cargar el ranking ahora mismo. Probá recargando la
            página.
          </p>
        )}

        {!stats && !error && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {stats && stats.total_results === 0 && (
          <p className="text-tdf-muted font-body">
            Todavía nadie hizo el test logueado.{" "}
            <Link
              to="/test-personalidad"
              className="text-tdf-purple hover:text-tdf-magenta transition-colors"
            >
              Sé el primero
            </Link>
            .
          </p>
        )}

        {stats && stats.total_results > 0 && (
          <>
            <p className="font-mono text-[11px] uppercase text-tdf-muted mb-4">
              {stats.total_results} resultado
              {stats.total_results === 1 ? "" : "s"} guardado
              {stats.total_results === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col gap-2">
              {stats.by_character.map((s, i) => (
                <RankingRow
                  key={s.character_name}
                  entry={s}
                  rank={i + 1}
                  failedImages={failedImages}
                  onImageError={handleImageError}
                />
              ))}
            </div>
          </>
        )}

        <Link
          to="/test-personalidad"
          className="inline-block mt-8 font-mono text-[11px] uppercase text-tdf-purple hover:text-tdf-magenta transition-colors"
        >
          ← Volver al test
        </Link>
      </div>
    </Layout>
  );
}
