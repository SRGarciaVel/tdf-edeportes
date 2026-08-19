import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import MatchHistoryModal from "../components/MatchHistoryModal";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  getMatchStats,
  getMyCfnRegistration,
  listCfnPlayers,
  registerCfn,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type { CFNMatchStats, CFNPlayer, CFNRegistration } from "../lib/types";

const DAY_OPTIONS = [1, 3, 7] as const;
// mínimo de partidas decididas para que alguien pueda ganar el KPI de
// "mejor win rate" — sin esto, alguien con 1 partida jugada y 1-0 le
// gana a todo el grupo con un "100%" que no dice nada
const MIN_MATCHES_FOR_BEST_WR = 3;

/** Ordena de mayor a menor LP — los que todavía no tienen stats quedan
 * al final. */
function sortByLp(players: CFNPlayer[]): CFNPlayer[] {
  return [...players].sort(
    (a, b) => (b.league_points ?? -1) - (a.league_points ?? -1),
  );
}

/** "hace 12 min" / "hace 3 h" / "hace 2 d" — a partir de un ISO date. */
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

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="text-2xl font-bold text-white leading-none">
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[11px] text-gray-600 truncate">
          {sub}
        </span>
      )}
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

  return (
    <div className="font-mono text-[11px] text-gray-500 border-t border-tdf-line/60 mt-3 pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-white">
          {stats.wins}W-{stats.losses}L
        </span>
        {stats.win_rate != null && (
          <span className="text-tdf-magenta">
            {Math.round(stats.win_rate * 100)}% WR
          </span>
        )}
        <span className="text-gray-600">·</span>
        <span className="flex flex-wrap items-center gap-x-1.5">
          {topThree.map(([name, count], i) => (
            <span key={name}>
              <span className={characterColorClass(name)}>{name}</span>
              <span className="text-gray-500"> x{count}</span>
              {i < topThree.length - 1 && (
                <span className="text-gray-600">,</span>
              )}
            </span>
          ))}
          {rest > 0 && <span className="text-gray-600">+{rest} más</span>}
        </span>
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

function PlayerAvatar({ player }: { player: CFNPlayer }) {
  if (player.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.display_name}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return <InitialsAvatar seed={player.display_name} size={10} />;
}

function PlayerCard({
  player,
  profilesLoading,
  isTopMr,
  maxLpOverall,
  matchStats,
  statsLoading,
  onOpenHistory,
}: {
  player: CFNPlayer;
  profilesLoading: boolean;
  isTopMr: boolean;
  maxLpOverall: number;
  matchStats?: CFNMatchStats;
  statsLoading: boolean;
  onOpenHistory: (player: CFNPlayer) => void;
}) {
  const hasStats =
    !player.last_error &&
    (player.league_points != null || player.character_name);
  const lpBarPct =
    hasStats && player.league_points != null && maxLpOverall > 0
      ? Math.max(4, Math.round((player.league_points / maxLpOverall) * 100))
      : 0;

  // stopPropagation + preventDefault: las cards con perfil de Liquipedia
  // son un <a> completo hacia ese link — sin esto, el botón "Ver
  // partidas" de adentro dispararía también la navegación externa
  const handleOpenHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenHistory(player);
  };

  const content = (
    <>
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {isTopMr && (
          <span className="bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-magenta">
            // Top MR
          </span>
        )}
        {player.is_tdf && (
          <span className="bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-purple">
            TDF
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PlayerAvatar player={player} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{player.display_name}</p>
            <p className="font-mono text-xs text-gray-600">
              CFN {player.cfn_id}
              {player.liquipedia_url && (
                <span className="text-tdf-purple"> · Liquipedia ↗</span>
              )}
            </p>
            {profilesLoading ? (
              <Skeleton className="h-3 w-16 mt-1" />
            ) : (
              hasStats &&
              player.character_name && (
                <p
                  className={`font-mono text-xs mt-1 ${characterColorClass(player.character_name)}`}
                >
                  {player.character_name}
                </p>
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
            {player.master_rating != null && (
              <span className="font-mono text-xs uppercase text-tdf-magenta border border-tdf-magenta/40 px-2 py-1">
                {player.master_rating} MR
              </span>
            )}
            {player.league_points != null && (
              <>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  {player.league_points} LP
                </p>
                <div className="w-24 h-1 bg-tdf-line mt-1 ml-auto overflow-hidden">
                  <div
                    className="h-full bg-tdf-magenta"
                    style={{ width: `${lpBarPct}%` }}
                  />
                </div>
              </>
            )}
            {player.updated_at && (
              <p className="font-mono text-[10px] text-gray-700 mt-1">
                {relativeTime(player.updated_at)}
              </p>
            )}
          </div>
        ) : (
          <span className="font-mono text-xs uppercase text-gray-600 border border-tdf-line px-2 py-1 shrink-0">
            Próximamente
          </span>
        )}
      </div>
      <MatchStatsRow
        stats={matchStats}
        loading={statsLoading}
        onOpenHistory={handleOpenHistory}
      />
    </>
  );

  const className =
    "hud-frame bg-tdf-charcoal px-5 pt-8 pb-4 flex flex-col transition-all duration-200 relative" +
    (isTopMr ? " border-tdf-magenta" : "") +
    (player.liquipedia_url
      ? " hover:border-tdf-magenta hover:shadow-[0_0_20px_-4px_rgba(196,20,122,0.7)] cursor-pointer"
      : "");

  if (player.liquipedia_url) {
    return (
      <a
        href={player.liquipedia_url}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

/** Formulario de auto-registro — solo visible logueado. No distingue
 * "nunca pidió nada" de "ya está aprobado" (el backend devuelve null
 * en los dos casos, ver GET /cfn/register/me): una vez aprobado, la
 * persona ya se ve en la lista de abajo, así que mostrar el formulario
 * de nuevo en ese caso es solo una molestia menor, no un error real. */
function RegistrationForm({
  registration,
  onRegistered,
}: {
  registration: CFNRegistration | null;
  onRegistered: (r: CFNRegistration) => void;
}) {
  const { token } = useAuth();
  const [cfnId, setCfnId] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageFile(file, 120, 0.85);
      setAvatarPreview(resized);
    } catch {
      setError("No se pudo procesar esa imagen.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const trimmed = cfnId.trim();
    if (!/^\d{5,20}$/.test(trimmed)) {
      setError("El CFN ID tiene que ser solo números.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerCfn(
        token,
        trimmed,
        avatarPreview ?? undefined,
      );
      onRegistered(result);
    } catch {
      setError(
        "No se pudo enviar la solicitud. Puede que ese CFN ID ya esté registrado.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (registration?.status === "pending") {
    return (
      <div className="hud-frame bg-tdf-charcoal px-5 py-4 mb-8">
        <p className="font-mono text-xs uppercase text-tdf-magenta mb-1">
          Solicitud enviada
        </p>
        <p className="text-sm text-gray-400">
          Tu CFN {registration.cfn_id} está pendiente de revisión por staff. Te
          vas a ver en la lista una vez que se apruebe.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hud-frame bg-tdf-charcoal px-5 py-4 mb-8 flex flex-wrap items-end gap-3"
    >
      <div className="flex-1 min-w-[200px]">
        <p className="font-mono text-xs uppercase text-gray-500 mb-2">
          Súmate a la lista
        </p>
        <input
          value={cfnId}
          onChange={(e) => setCfnId(e.target.value)}
          placeholder="Tu CFN ID (solo números)"
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-mono"
        />
        {registration?.status === "rejected" && (
          <p className="font-mono text-[11px] text-gray-600 mt-1">
            Tu solicitud anterior no se aprobó. Puedes intentar de nuevo.
          </p>
        )}
        {error && (
          <p className="font-mono text-[11px] text-red-400 mt-1">{error}</p>
        )}
      </div>
      <label className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase cursor-pointer shrink-0">
        {avatarPreview ? "Imagen lista ✓" : "Subir foto (opcional)"}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !cfnId.trim()}
        className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white disabled:opacity-50 shrink-0"
      >
        {submitting ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

export default function JugadoresPage() {
  const { user, token } = useAuth();
  const [players, setPlayers] = useState<CFNPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [matchStats, setMatchStats] = useState<Map<string, CFNMatchStats>>(
    new Map(),
  );
  const [statsLoading, setStatsLoading] = useState(true);
  // 7 días por defecto: las partidas más recientes que tenemos guardadas
  // hoy son de hace unos días — con 1 día por defecto la página se vería
  // vacía hasta que se acumulen partidas más nuevas con el cron.
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(7);
  const [historyPlayer, setHistoryPlayer] = useState<CFNPlayer | null>(null);
  const [myRegistration, setMyRegistration] = useState<CFNRegistration | null>(
    null,
  );

  useEffect(() => {
    listCfnPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setPlayersLoading(false));
  }, []);

  useEffect(() => {
    if (!token) {
      setMyRegistration(null);
      return;
    }
    getMyCfnRegistration(token)
      .then(setMyRegistration)
      .catch(() => setMyRegistration(null));
  }, [token]);

  useEffect(() => {
    if (players.length === 0) return;
    setStatsLoading(true);
    Promise.all(
      players.map((p) => getMatchStats(p.cfn_id, days).catch(() => null)),
    )
      .then((results) => {
        const map = new Map<string, CFNMatchStats>();
        results.forEach((stats, i) => {
          if (stats) map.set(players[i].cfn_id, stats);
        });
        setMatchStats(map);
      })
      .catch(() => setMatchStats(new Map()))
      .finally(() => setStatsLoading(false));
  }, [players, days]);

  const sortedPlayers = useMemo(() => sortByLp(players), [players]);

  const maxLpOverall = useMemo(
    () => Math.max(0, ...players.map((p) => p.league_points ?? 0)),
    [players],
  );

  const topMrCfnId = useMemo(() => {
    let best: { cfnId: string; mr: number } | null = null;
    for (const p of players) {
      if (p.master_rating != null && (!best || p.master_rating > best.mr)) {
        best = { cfnId: p.cfn_id, mr: p.master_rating };
      }
    }
    return best?.cfnId ?? null;
  }, [players]);

  // KPIs del grupo para la ventana de días seleccionada — a diferencia
  // del viejo "personaje más jugado" (que miraba el perfil actual, fijo),
  // esto se recalcula solo cada vez que cambia el filtro de días.
  const groupStats = useMemo(() => {
    let totalMatches = 0;
    let totalWins = 0;
    let totalDecided = 0;
    const characterCounts = new Map<string, number>();
    let bestPlayer: {
      name: string;
      winRate: number;
      wins: number;
      losses: number;
    } | null = null;

    for (const player of players) {
      const stats = matchStats.get(player.cfn_id);
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
          bestPlayer = {
            name: player.display_name,
            winRate: stats.win_rate,
            wins: stats.wins,
            losses: stats.losses,
          };
        }
      }
    }

    let topCharacter: { name: string; count: number } | null = null;
    for (const [name, count] of characterCounts) {
      if (!topCharacter || count > topCharacter.count)
        topCharacter = { name, count };
    }

    return {
      totalMatches,
      groupWinRate: totalDecided > 0 ? totalWins / totalDecided : null,
      topCharacter,
      bestPlayer,
    };
  }, [players, matchStats]);

  return (
    <Layout>
      <SectionLabel index="05">Street Fighter 6 CFN</SectionLabel>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-3xl font-bold">Jugadores</h1>
        <div className="flex items-center gap-3">
          {user?.is_staff && (
            <Link
              to="/staff/cfn"
              className="font-mono text-xs uppercase text-tdf-purple hover:text-tdf-magenta transition-colors"
            >
              Panel de solicitudes →
            </Link>
          )}
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
      </div>
      <p className="text-gray-500 mb-1 max-w-xl">
        Rango, LP y personaje principal de la comunidad. TDF y la escena
        chilena, todos en el mismo pozo. Se actualiza cada hora, no en vivo. El
        resumen de arriba y las tarjetas de abajo son de los últimos {days} día
        {days > 1 ? "s" : ""}.
      </p>
      <p className="font-mono text-[11px] text-gray-600 mb-6">
        La etiqueta <span className="text-tdf-purple">TDF</span> marca a quienes
        son parte del staff/colaboradores del club, el resto es comunidad. Las
        tarjetas con <span className="text-tdf-purple">Liquipedia ↗</span> son
        clickeables, llevan a su perfil competitivo.
      </p>

      {user && (
        <RegistrationForm
          registration={myRegistration}
          onRegistered={setMyRegistration}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        {statsLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col gap-2"
              >
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
              value={groupStats.topCharacter?.name ?? "N/D"}
              sub={
                groupStats.topCharacter
                  ? `${groupStats.topCharacter.count} partidas`
                  : undefined
              }
            />
            <KpiTile
              label="Partidas trackeadas"
              value={String(groupStats.totalMatches)}
            />
            <KpiTile
              label="Win rate del grupo"
              value={
                groupStats.groupWinRate != null
                  ? `${Math.round(groupStats.groupWinRate * 100)}%`
                  : "N/D"
              }
            />
            <KpiTile
              label="Mejor win rate"
              value={
                groupStats.bestPlayer
                  ? `${Math.round(groupStats.bestPlayer.winRate * 100)}%`
                  : "N/D"
              }
              sub={
                groupStats.bestPlayer
                  ? `${groupStats.bestPlayer.name} (${groupStats.bestPlayer.wins}W-${groupStats.bestPlayer.losses}L)`
                  : `mín. ${MIN_MATCHES_FOR_BEST_WR} partidas`
              }
            />
          </>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-3">
        {sortedPlayers.map((p) => (
          <PlayerCard
            key={p.cfn_id}
            player={p}
            profilesLoading={playersLoading}
            isTopMr={p.cfn_id === topMrCfnId}
            maxLpOverall={maxLpOverall}
            matchStats={matchStats.get(p.cfn_id)}
            statsLoading={statsLoading}
            onOpenHistory={setHistoryPlayer}
          />
        ))}
      </div>

      {historyPlayer && (
        <MatchHistoryModal
          playerName={historyPlayer.display_name}
          cfnId={historyPlayer.cfn_id}
          days={days}
          onClose={() => setHistoryPlayer(null)}
        />
      )}
    </Layout>
  );
}
