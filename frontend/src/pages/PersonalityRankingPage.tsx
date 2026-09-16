import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getSfPersonalityStats } from "../lib/api";
import type { SFStatsResponse } from "../lib/types";

/** Ranking de resultados del test de personalidad SF — solo cuenta a
 * quienes hicieron el test logueados (ver SFPersonalityResult en el
 * backend), así que el total puede ser más chico que la cantidad real
 * de gente que probó el test como invitado. */
export default function PersonalityRankingPage() {
  const [stats, setStats] = useState<SFStatsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSfPersonalityStats()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

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
              <Skeleton key={i} className="h-12 w-full" />
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
                <div
                  key={s.character_name}
                  className="hud-frame bg-tdf-charcoal border border-tdf-line p-3 flex items-center gap-4"
                >
                  <span className="font-mono text-xs text-tdf-muted w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-body text-sm flex-1 truncate">
                    {s.character_name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-1.5 bg-tdf-line overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-tdf-magenta to-tdf-purple"
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-tdf-muted w-12 text-right">
                      {s.percentage}%
                    </span>
                  </div>
                </div>
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
