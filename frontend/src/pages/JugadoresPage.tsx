import { useEffect, useMemo, useState } from "react";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { listCfnPlayers } from "../lib/api";
import type { CFNProfile } from "../lib/types";

interface PlayerEntry {
  name: string;
  cfnId: string;
  liquipediaUrl?: string;
}

const TDF_PLAYERS: PlayerEntry[] = [
  { name: "Sirxtias", cfnId: "2844671427" },
  { name: "Drachen", cfnId: "2908057346" },
  { name: "BazthyFreeman", cfnId: "4100957688" },
  { name: "AckermanFG", cfnId: "1733837998" },
];

// los 4 tienen perfil propio en Liquipedia como jugadores competitivos —
// se linkea por respeto a su trayectoria, no todos los de la escena lo tienen
const SCENE_PLAYERS: PlayerEntry[] = [
  { name: "Younghou", cfnId: "1027356162", liquipediaUrl: "https://liquipedia.net/fighters/Younghou" },
  { name: "Pochoclo23", cfnId: "3987753314", liquipediaUrl: "https://liquipedia.net/fighters/Pochoclo23" },
  { name: "Craime", cfnId: "1009159858", liquipediaUrl: "https://liquipedia.net/fighters/Craime" },
  { name: "Blaz", cfnId: "3381453962", liquipediaUrl: "https://liquipedia.net/fighters/Blaz" },
];

/** Ordena de mayor a menor LP — los que todavía no tienen stats quedan al
 * final, en el orden original en que los definimos arriba. */
function sortByLp(players: PlayerEntry[], profiles: Map<string, CFNProfile>): PlayerEntry[] {
  return [...players].sort((a, b) => {
    const lpA = profiles.get(a.cfnId)?.league_points ?? -1;
    const lpB = profiles.get(b.cfnId)?.league_points ?? -1;
    return lpB - lpA;
  });
}

/** "hace 12 min" / "hace 3 h" / "hace 2 d" — a partir de updated_at. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function PlayerCard({
  player,
  profile,
  isTopMr,
  maxLpInGroup,
}: {
  player: PlayerEntry;
  profile?: CFNProfile;
  isTopMr: boolean;
  maxLpInGroup: number;
}) {
  const hasStats = profile && !profile.last_error && (profile.league_points != null || profile.character_name);
  const lpBarPct =
    hasStats && profile.league_points != null && maxLpInGroup > 0
      ? Math.max(4, Math.round((profile.league_points / maxLpInGroup) * 100))
      : 0;

  const content = (
    <>
      {isTopMr && (
        <span className="absolute -top-2.5 left-3 bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-magenta z-10">
          // Top MR
        </span>
      )}
      <div className="flex items-center gap-3 min-w-0">
        <InitialsAvatar seed={player.name} size={10} />
        <div className="min-w-0">
          <p className="font-semibold truncate">{player.name}</p>
          <p className="font-mono text-xs text-gray-600">CFN {player.cfnId}</p>
          {hasStats && profile.character_name && (
            <p className="font-mono text-xs text-tdf-purple mt-1">{profile.character_name}</p>
          )}
        </div>
      </div>
      {hasStats ? (
        <div className="text-right shrink-0">
          {profile.master_rating != null && (
            <span className="font-mono text-xs uppercase text-tdf-magenta border border-tdf-magenta/40 px-2 py-1">
              {profile.master_rating} MR
            </span>
          )}
          {profile.league_points != null && (
            <>
              <p className="font-mono text-xs text-gray-500 mt-1">{profile.league_points} LP</p>
              <div className="w-24 h-1 bg-tdf-line mt-1 ml-auto overflow-hidden">
                <div
                  className="h-full bg-tdf-magenta"
                  style={{ width: `${lpBarPct}%` }}
                />
              </div>
            </>
          )}
          <p className="font-mono text-[10px] text-gray-700 mt-1">{relativeTime(profile.updated_at)}</p>
        </div>
      ) : (
        <span className="font-mono text-xs uppercase text-gray-600 border border-tdf-line px-2 py-1 shrink-0">
          Próximamente
        </span>
      )}
    </>
  );

  const className =
    "hud-frame bg-tdf-charcoal px-5 py-4 flex items-center justify-between gap-3 transition-all duration-200 relative" +
    (isTopMr ? " border-tdf-magenta" : "") +
    (player.liquipediaUrl
      ? " hover:border-tdf-magenta hover:shadow-[0_0_20px_-4px_rgba(196,20,122,0.7)] cursor-pointer"
      : "");

  if (player.liquipediaUrl) {
    return (
      <a href={player.liquipediaUrl} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export default function JugadoresPage() {
  const [profiles, setProfiles] = useState<Map<string, CFNProfile>>(new Map());

  useEffect(() => {
    listCfnPlayers()
      .then((data) => setProfiles(new Map(data.map((p) => [p.cfn_id, p]))))
      .catch(() => setProfiles(new Map()));
  }, []);

  const sortedTdf = useMemo(() => sortByLp(TDF_PLAYERS, profiles), [profiles]);
  const sortedScene = useMemo(() => sortByLp(SCENE_PLAYERS, profiles), [profiles]);

  const maxLpTdf = useMemo(
    () => Math.max(0, ...TDF_PLAYERS.map((p) => profiles.get(p.cfnId)?.league_points ?? 0)),
    [profiles]
  );
  const maxLpScene = useMemo(
    () => Math.max(0, ...SCENE_PLAYERS.map((p) => profiles.get(p.cfnId)?.league_points ?? 0)),
    [profiles]
  );

  const topMrCfnId = useMemo(() => {
    let best: { cfnId: string; mr: number } | null = null;
    for (const p of profiles.values()) {
      if (p.master_rating != null && (!best || p.master_rating > best.mr)) {
        best = { cfnId: p.cfn_id, mr: p.master_rating };
      }
    }
    return best?.cfnId ?? null;
  }, [profiles]);

  const mostPlayedCharacter = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of profiles.values()) {
      if (!p.character_name) continue;
      counts.set(p.character_name, (counts.get(p.character_name) ?? 0) + 1);
    }
    let best: { name: string; count: number } | null = null;
    for (const [name, count] of counts) {
      if (!best || count > best.count) best = { name, count };
    }
    return best;
  }, [profiles]);

  return (
    <Layout>
      <SectionLabel index="05">Street Fighter 6 CFN</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Jugadores</h1>
      <p className="text-gray-500 mb-2 max-w-xl">
        Rango, LP y personaje principal de la escena. Se actualiza cada
        hora, no en vivo.
      </p>
      {mostPlayedCharacter && (
        <p className="font-mono text-xs text-tdf-purple mb-10">
          // El personaje más jugado del grupo: {mostPlayedCharacter.name} (
          {mostPlayedCharacter.count} de {profiles.size})
        </p>
      )}

      <div className="mb-14">
        <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">TDF</h2>
        <div className="grid sm:grid-cols-2 gap-3 pt-3">
          {sortedTdf.map((p) => (
            <PlayerCard
              key={p.cfnId}
              player={p}
              profile={profiles.get(p.cfnId)}
              isTopMr={p.cfnId === topMrCfnId}
              maxLpInGroup={maxLpTdf}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">
          Escena chilena
        </h2>
        <p className="font-mono text-[11px] text-gray-600 mb-6">
          Click en una card para ver su perfil competitivo en Liquipedia →
        </p>
        <div className="grid sm:grid-cols-2 gap-3 pt-3">
          {sortedScene.map((p) => (
            <PlayerCard
              key={p.cfnId}
              player={p}
              profile={profiles.get(p.cfnId)}
              isTopMr={p.cfnId === topMrCfnId}
              maxLpInGroup={maxLpScene}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}
