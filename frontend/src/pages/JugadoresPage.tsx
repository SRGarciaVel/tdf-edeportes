import { useEffect, useMemo, useState } from "react";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import MatchHistoryModal from "../components/MatchHistoryModal";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getMatchStats, listCfnPlayers } from "../lib/api";
import type { CFNMatchStats, CFNProfile } from "../lib/types";

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
  { name: "TDF Super Ñema", cfnId: "1964247128" },
  { name: "Jager Eins", cfnId: "2281859090" },
  { name: "Zackito", cfnId: "2449521700" },
];

// los 4 tienen perfil propio en Liquipedia como jugadores competitivos —
// se linkea por respeto a su trayectoria, no todos los de la escena lo tienen
const SCENE_PLAYERS: PlayerEntry[] = [
  { name: "Younghou", cfnId: "1027356162", liquipediaUrl: "https://liquipedia.net/fighters/Younghou" },
  { name: "Pochoclo23", cfnId: "3987753314", liquipediaUrl: "https://liquipedia.net/fighters/Pochoclo23" },
  { name: "Craime", cfnId: "1009159858", liquipediaUrl: "https://liquipedia.net/fighters/Craime" },
  { name: "Blaz", cfnId: "3381453962", liquipediaUrl: "https://liquipedia.net/fighters/Blaz" },
];

const ALL_PLAYERS = [...TDF_PLAYERS, ...SCENE_PLAYERS];
const DAY_OPTIONS = [1, 3, 7] as const;
// mínimo de partidas decididas para que alguien pueda ganar el KPI de
// "mejor win rate" — sin esto, alguien con 1 partida jugada y 1-0 le
// gana a todo el grupo con un "100%" que no dice nada
const MIN_MATCHES_FOR_BEST_WR = 3;

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

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-white leading-none">{value}</span>
      {sub && <span className="font-mono text-[11px] text-gray-600 truncate">{sub}</span>}
    </div>
  );
}

function MatchStatsRow({
  stats,
  loading,
  onOpenHistory,
}: {
  stats?: CFNMatchStats;
  loading: boolean;
  onOpenHistory: (e: React.MouseEvent) => void;
}) {
  if (loading) {
    return (
      <div className="border-t border-tdf-line/60 mt-3 pt-2">
        <Skeleton className="h-3 w-40" />
      </div>
    );
  }

  if (!stats || stats.total_matches === 0) {
    return (
      <p className="font-mono text-[11px] text-gray-700 border-t border-tdf-line/60 mt-3 pt-2">
        Sin partidas en este período
      </p>
    );
  }

  // se trunca a los 3 personajes más usados — con jugadores que rotan
  // mucho de personaje, la lista completa en una sola línea se volvía
  // ilegible (ver lessons.md); el detalle completo vive en el modal
  const entries = Object.entries(stats.characters);
  const topThree = entries.slice(0, 3);
  const rest = entries.length - topThree.length;
  const characterList =
    topThree.map(([name, count]) => `${name} x${count}`).join(", ") +
    (rest > 0 ? ` +${rest} más` : "");

  return (
    <div className="font-mono text-[11px] text-gray-500 border-t border-tdf-line/60 mt-3 pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-white">
          {stats.wins}W-{stats.losses}L
        </span>
        {stats.win_rate != null && (
          <span className="text-tdf-magenta">{Math.round(stats.win_rate * 100)}% WR</span>
        )}
        <span className="text-gray-600">·</span>
        <span>{characterList}</span>
      </div>
      <button
        onClick={onOpenHistory}
        className="text-tdf-purple hover:text-tdf-magenta transition-colors shrink-0"
      >
        Ver partidas →
      </button>
    </div>
  );
}

function PlayerCard({
  player,
  profile,
  profilesLoading,
  isTopMr,
  maxLpInGroup,
  matchStats,
  statsLoading,
  onOpenHistory,
}: {
  player: PlayerEntry;
  profile?: CFNProfile;
  profilesLoading: boolean;
  isTopMr: boolean;
  maxLpInGroup: number;
  matchStats?: CFNMatchStats;
  statsLoading: boolean;
  onOpenHistory: (player: PlayerEntry) => void;
}) {
  const hasStats = profile && !profile.last_error && (profile.league_points != null || profile.character_name);
  const lpBarPct =
    hasStats && profile.league_points != null && maxLpInGroup > 0
      ? Math.max(4, Math.round((profile.league_points / maxLpInGroup) * 100))
      : 0;

  // stopPropagation + preventDefault: las cards de la escena chilena son
  // un <a> completo hacia Liquipedia — sin esto, el botón "Ver partidas"
  // de adentro dispararía también la navegación externa
  const handleOpenHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenHistory(player);
  };

  const content = (
    <>
      {isTopMr && (
        <span className="absolute -top-2.5 left-3 bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-magenta z-10">
          // Top MR
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <InitialsAvatar seed={player.name} size={10} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{player.name}</p>
            <p className="font-mono text-xs text-gray-600">CFN {player.cfnId}</p>
            {profilesLoading ? (
              <Skeleton className="h-3 w-16 mt-1" />
            ) : (
              hasStats &&
              profile.character_name && (
                <p className="font-mono text-xs text-tdf-purple mt-1">{profile.character_name}</p>
              )
            )}
          </div>
        </div>
        {profilesLoading ? (
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
        ) : hasStats ? (
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
                  <div className="h-full bg-tdf-magenta" style={{ width: `${lpBarPct}%` }} />
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
      </div>
      <MatchStatsRow stats={matchStats} loading={statsLoading} onOpenHistory={handleOpenHistory} />
    </>
  );

  const className =
    "hud-frame bg-tdf-charcoal px-5 py-4 flex flex-col transition-all duration-200 relative" +
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
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [matchStats, setMatchStats] = useState<Map<string, CFNMatchStats>>(new Map());
  const [statsLoading, setStatsLoading] = useState(true);
  // 7 días por defecto: las partidas más recientes que tenemos guardadas
  // hoy son de hace unos días — con 1 día por defecto la página se vería
  // vacía hasta que se acumulen partidas más nuevas con el cron.
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(7);
  const [historyPlayer, setHistoryPlayer] = useState<PlayerEntry | null>(null);

  useEffect(() => {
    listCfnPlayers()
      .then((data) => setProfiles(new Map(data.map((p) => [p.cfn_id, p]))))
      .catch(() => setProfiles(new Map()))
      .finally(() => setProfilesLoading(false));
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    Promise.all(ALL_PLAYERS.map((p) => getMatchStats(p.cfnId, days).catch(() => null)))
      .then((results) => {
        const map = new Map<string, CFNMatchStats>();
        results.forEach((stats, i) => {
          if (stats) map.set(ALL_PLAYERS[i].cfnId, stats);
        });
        setMatchStats(map);
      })
      .catch(() => setMatchStats(new Map()))
      .finally(() => setStatsLoading(false));
  }, [days]);

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

  // KPIs del grupo para la ventana de días seleccionada — a diferencia
  // del viejo "personaje más jugado" (que miraba el perfil actual, fijo),
  // esto se recalcula solo cada vez que cambia el filtro de días.
  const groupStats = useMemo(() => {
    let totalMatches = 0;
    let totalWins = 0;
    let totalDecided = 0;
    const characterCounts = new Map<string, number>();
    let bestPlayer: { name: string; winRate: number; wins: number; losses: number } | null = null;

    for (const player of ALL_PLAYERS) {
      const stats = matchStats.get(player.cfnId);
      if (!stats) continue;

      totalMatches += stats.total_matches;
      totalWins += stats.wins;
      const decided = stats.wins + stats.losses;
      totalDecided += decided;

      for (const [char, count] of Object.entries(stats.characters)) {
        characterCounts.set(char, (characterCounts.get(char) ?? 0) + count);
      }

      if (decided >= MIN_MATCHES_FOR_BEST_WR && stats.win_rate != null) {
        if (!bestPlayer || stats.win_rate > bestPlayer.winRate) {
          bestPlayer = { name: player.name, winRate: stats.win_rate, wins: stats.wins, losses: stats.losses };
        }
      }
    }

    let topCharacter: { name: string; count: number } | null = null;
    for (const [name, count] of characterCounts) {
      if (!topCharacter || count > topCharacter.count) topCharacter = { name, count };
    }

    return {
      totalMatches,
      groupWinRate: totalDecided > 0 ? totalWins / totalDecided : null,
      topCharacter,
      bestPlayer,
    };
  }, [matchStats]);

  return (
    <Layout>
      <SectionLabel index="05">Street Fighter 6 CFN</SectionLabel>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-3xl font-bold">Jugadores</h1>
        <div className="flex gap-2 font-mono text-xs">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 border transition-colors ${
                days === d
                  ? "border-tdf-magenta text-tdf-magenta"
                  : "border-tdf-line text-gray-500 hover:text-white"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>
      <p className="text-gray-500 mb-6 max-w-xl">
        Rango, LP y personaje principal de la escena. Se actualiza cada
        hora, no en vivo. Los KPIs y las cards de abajo son de los
        últimos {days} día{days > 1 ? "s" : ""}.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        {statsLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col gap-2">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <KpiTile
              label="Personaje del grupo"
              value={groupStats.topCharacter?.name ?? "—"}
              sub={groupStats.topCharacter ? `${groupStats.topCharacter.count} partidas` : undefined}
            />
            <KpiTile label="Partidas trackeadas" value={String(groupStats.totalMatches)} />
            <KpiTile
              label="Win rate del grupo"
              value={groupStats.groupWinRate != null ? `${Math.round(groupStats.groupWinRate * 100)}%` : "—"}
            />
            <KpiTile
              label="Mejor win rate"
              value={groupStats.bestPlayer ? `${Math.round(groupStats.bestPlayer.winRate * 100)}%` : "—"}
              sub={
                groupStats.bestPlayer
                  ? `${groupStats.bestPlayer.name} (${groupStats.bestPlayer.wins}W-${groupStats.bestPlayer.losses}L)`
                  : `mín. ${MIN_MATCHES_FOR_BEST_WR} partidas`
              }
            />
          </>
        )}
      </div>

      <div className="mb-14">
        <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">TDF</h2>
        <div className="grid sm:grid-cols-2 gap-3 pt-3">
          {sortedTdf.map((p) => (
            <PlayerCard
              key={p.cfnId}
              player={p}
              profile={profiles.get(p.cfnId)}
              profilesLoading={profilesLoading}
              isTopMr={p.cfnId === topMrCfnId}
              maxLpInGroup={maxLpTdf}
              matchStats={matchStats.get(p.cfnId)}
              statsLoading={statsLoading}
              onOpenHistory={setHistoryPlayer}
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
              profilesLoading={profilesLoading}
              isTopMr={p.cfnId === topMrCfnId}
              maxLpInGroup={maxLpScene}
              matchStats={matchStats.get(p.cfnId)}
              statsLoading={statsLoading}
              onOpenHistory={setHistoryPlayer}
            />
          ))}
        </div>
      </div>

      {historyPlayer && (
        <MatchHistoryModal
          playerName={historyPlayer.name}
          cfnId={historyPlayer.cfnId}
          days={days}
          onClose={() => setHistoryPlayer(null)}
        />
      )}
    </Layout>
  );
}
