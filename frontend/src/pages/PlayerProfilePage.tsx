import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlayerCard, { CardBackgroundPhoto } from "../components/PlayerCard";
import SocialLinksRow from "../components/SocialLinksRow";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import SkillRadarChart from "../components/SkillRadarChart";
import Skeleton from "../components/Skeleton";
import { getCfnPlayer, getMatchStats, getPlayerSkills } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type { CFNMatchStats, CFNPlayer, SkillAxis } from "../lib/types";

const STATS_DAYS = 7;

/** Perfil público de CUALQUIER jugador (pedido de Seba, 29-08-2026:
 * "que los usuarios puedan ver los perfiles entre ellos") — misma
 * presentación que /perfil (banner, avatar, bio, card real con su
 * flip/fade, radar de habilidades, achievements) pero de solo
 * lectura, sin ningún control de edición. La distinción Staff no
 * aplica acá (CFNPlayerRead no expone ese dato); en su lugar se
 * muestra el badge "TDF" si corresponde, igual que en /jugadores. */
export default function PlayerProfilePage() {
  const { cfnId } = useParams<{ cfnId: string }>();
  const [player, setPlayer] = useState<CFNPlayer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CFNMatchStats>();
  const [statsLoading, setStatsLoading] = useState(true);
  const [skills, setSkills] = useState<SkillAxis[] | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);

  useEffect(() => {
    if (!cfnId) return;
    setLoading(true);
    setNotFound(false);
    getCfnPlayer(cfnId)
      .then(setPlayer)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    setStatsLoading(true);
    getMatchStats(cfnId, STATS_DAYS)
      .then(setStats)
      .finally(() => setStatsLoading(false));

    setSkillsLoading(true);
    getPlayerSkills(cfnId)
      .then(setSkills)
      .finally(() => setSkillsLoading(false));
  }, [cfnId]);

  if (loading) {
    return (
      <Layout>
        <SectionLabel index="J1">Perfil de jugador</SectionLabel>
        <div className="flex flex-col gap-6">
          {/* banner + avatar — mismas medidas que el real */}
          <div className="hud-frame bg-tdf-charcoal overflow-hidden">
            <Skeleton className="h-32 sm:h-44 w-full rounded-none" />
            <div className="px-6 pb-5 pt-3 flex flex-col sm:flex-row sm:items-start gap-4">
              <Skeleton className="w-24 h-24 rounded-full shrink-0 -mt-12 border-4 border-tdf-charcoal" />
              <div className="flex-1 pt-3 sm:pt-4 flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="flex flex-col gap-6">
              <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <Skeleton className="min-h-[210px] w-full" />
              <div className="hud-frame bg-tdf-charcoal px-4 py-5 flex flex-col items-center gap-3">
                <Skeleton className="h-2.5 w-32" />
                <Skeleton className="h-52 w-52 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (notFound || !player) {
    return (
      <Layout>
        <SectionLabel index="J1">Perfil de jugador</SectionLabel>
        <p className="text-tdf-muted font-body text-sm">
          No encontramos a ese jugador.{" "}
          <Link to="/jugadores" className="text-tdf-magenta hover:underline">
            Volver a Jugadores
          </Link>
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <SectionLabel index="J1">Perfil de jugador</SectionLabel>

      <div className="flex flex-col gap-6">
        <div className="hud-frame bg-tdf-charcoal overflow-hidden">
          <div className="relative h-32 sm:h-44 bg-gradient-to-br from-tdf-purple/30 to-tdf-magenta/20">
            {player.banner_url && (
              <CardBackgroundPhoto url={player.banner_url} brightness={null} />
            )}
          </div>
          <div className="px-6 pb-5 pt-3 relative z-10 flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="relative shrink-0 -mt-12">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-tdf-charcoal bg-tdf-dark">
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <InitialsAvatar seed={player.display_name} size={20} />
                )}
              </div>
            </div>

            <div className="flex-1 pt-3 sm:pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl">
                  {player.display_name}
                </h1>
                {player.is_tdf && (
                  <span className="text-xs bg-tdf-magenta/20 text-tdf-magenta px-2 py-0.5 rounded">
                    TDF
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {player.league_points != null && (
                  <span className="font-mono text-xs text-tdf-muted">
                    <span className="text-white font-semibold">
                      {player.league_points.toLocaleString("es-CL")}
                    </span>{" "}
                    LP
                  </span>
                )}
                {player.character_name && (
                  <span
                    className={`font-mono text-xs ${characterColorClass(player.character_name)}`}
                  >
                    {player.character_name}
                  </span>
                )}
              </div>
              {player.social_links.length > 0 && (
                <div className="mt-2.5">
                  <SocialLinksRow links={player.social_links} />
                </div>
              )}
              {player.bio && (
                <p className="font-body text-sm text-tdf-muted italic mt-2 max-w-lg">
                  "{player.bio}"
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="flex flex-col gap-6">
            <div className="hud-frame bg-tdf-charcoal px-6 py-5">
              <h2 className="font-mono text-xs uppercase text-tdf-muted mb-4">
                Achievements
              </h2>
              <p className="font-mono text-[10px] text-tdf-muted">
                Todavía no hay achievements en el sitio. Van a aparecer acá
                cuando estén listos.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <div>
              <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
                Card pública
              </p>
              <PlayerCard
                player={player}
                profilesLoading={false}
                isTopMr={false}
                matchStats={stats}
                statsLoading={statsLoading}
                isOwnCard={false}
                isStaff={false}
                preview
              />
            </div>

            <div className="hud-frame bg-tdf-charcoal px-4 py-5">
              <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2 text-center">
                Radar de habilidades
              </p>
              <SkillRadarChart axes={skills} loading={skillsLoading} />
              <p className="font-mono text-[9px] text-tdf-muted mt-2 text-center opacity-70">
                Escala relativa al roster de TDF. El mejor en cada categoría
                llega a 100.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
