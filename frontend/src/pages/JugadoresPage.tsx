import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import MatchHistoryModal from "../components/MatchHistoryModal";
import PlayerCard, { PlayerAvatarRing } from "../components/PlayerCard";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  getMatchStats,
  getMyCfnRegistration,
  listCfnPlayers,
  registerCfn,
  removePlayerCardBackground,
  setPlayerCardBackground,
  updateMyCardBackground,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { getImageBrightness, resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type { CFNMatchStats, CFNPlayer, CFNRegistration } from "../lib/types";

const DAY_OPTIONS = [1, 3, 7] as const;
// mínimo de partidas decididas para que alguien pueda ganar el KPI de
// "mejor win rate" — sin esto, alguien con 1 partida jugada y 1-0 le
// gana a todo el grupo con un "100%" que no dice nada
const MIN_MATCHES_FOR_BEST_WR = 3;
// pedido real de Seba (22-08-2026): "Records" (Drive Impact, Perfect
// Parry, etc.) no debería premiar a alguien que jugó poco comparado
// con el resto — 20 partidas trackeadas por TDF como piso mínimo para
// entrar en consideración, sin importar qué tan bueno sea el número en
// sí. Es un umbral MÁS ALTO que MIN_MATCHES_FOR_BEST_WR a propósito:
// ese es solo para no dividir por un puñado de partidas, este es para
// filtrar jugadores genuinamente poco activos de un ranking.
const MIN_MATCHES_FOR_RECORDS = 20;
// la foto de fondo es más grande que un avatar (ocupa media card), así
// que se redimensiona a más resolución que los 120px del avatar
const CARD_BACKGROUND_SIZE = 480;

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
      <span className="font-mono text-[10px] uppercase tracking-wider text-tdf-muted">
        {label}
      </span>
      <span className="text-2xl font-bold text-white leading-none">
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[11px] text-tdf-muted truncate">
          {sub}
        </span>
      )}
    </div>
  );
}

// "Records" — promedios de las últimas 100 partidas que Capcom ya
// calcula solo (Stats > Results del perfil), no algo que reconstruimos
// nosotros partida por partida. Todas las categorías ordenan de mayor
// a menor — no hay ninguna donde "menos" sea mejor.
const RECORD_CATEGORIES: {
  key:
    | "drive_impact_received"
    | "drive_parry_perfect"
    | "drive_impact_punish_landed"
    | "corner_time_opponent"
    | "throws_landed";
  label: string;
  unit: string;
  decimals: number;
}[] = [
  {
    key: "drive_impact_received",
    label: "El que más Drive Impact se come",
    unit: "por partida",
    decimals: 1,
  },
  {
    key: "drive_parry_perfect",
    label: "Mejor Perfect Parry",
    unit: "por partida",
    decimals: 1,
  },
  {
    key: "drive_impact_punish_landed",
    label: "El Drive Impact más letal",
    unit: "punish counters por partida",
    decimals: 1,
  },
  {
    key: "corner_time_opponent",
    label: "El más agresivo",
    unit: "segundos acorralando al rival",
    decimals: 1,
  },
  {
    key: "throws_landed",
    label: "El mejor agarrador",
    unit: "throws conectados por partida",
    decimals: 1,
  },
];

function RecordCard({
  label,
  unit,
  winner,
  value,
  decimals,
}: {
  label: string;
  unit: string;
  winner: CFNPlayer | null;
  value: number | null;
  decimals: number;
}) {
  return (
    <div className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-tdf-muted">
        {label}
      </span>
      {winner && value != null ? (
        <div className="flex items-center gap-2.5">
          {winner.avatar_url ? (
            <img
              src={winner.avatar_url}
              alt={winner.display_name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <InitialsAvatar seed={winner.display_name} size={9} />
          )}
          <div className="min-w-0">
            <p className="font-display font-bold truncate leading-tight">
              {winner.display_name}
            </p>
            <p className="font-body text-xs text-tdf-muted">
              <span className="text-white font-semibold">
                {value.toFixed(decimals)}
              </span>{" "}
              {unit}
            </p>
          </div>
        </div>
      ) : (
        <p className="font-body text-xs text-tdf-muted">Sin datos todavía</p>
      )}
    </div>
  );
}

/** Fila compacta para la vista "Lista" — todo el dato visible de
 * entrada, sin hover ni click para revelar nada. Existe justo para lo
 * contrario que la card de galería: comparar/escanear muchos jugadores
 * rápido (conversación de diseño, 22-08-2026). */
function PlayerListRow({
  player,
  isTopMr,
  matchStats,
  onOpenHistory,
}: {
  player: CFNPlayer;
  isTopMr: boolean;
  matchStats?: CFNMatchStats;
  onOpenHistory: (player: CFNPlayer) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-tdf-line/40 last:border-b-0 hover:bg-tdf-dark/40 transition-colors">
      <PlayerAvatarRing player={player} />
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-sm flex items-center gap-1.5">
          <span className="truncate">{player.display_name}</span>
          {player.is_tdf && (
            <span className="font-mono text-[9px] uppercase text-tdf-magenta shrink-0">
              TDF
            </span>
          )}
        </p>
        {player.character_name && (
          <p
            className={`font-mono text-[10px] uppercase truncate ${characterColorClass(player.character_name)}`}
          >
            {player.character_name}
          </p>
        )}
      </div>

      <div className="hidden sm:block text-right shrink-0 w-16">
        {player.master_rating != null ? (
          <>
            <span
              className={`font-display font-bold ${isTopMr ? "text-white" : "text-tdf-muted"}`}
            >
              {player.master_rating}
            </span>
            <span className="font-mono text-[9px] text-tdf-muted ml-1">MR</span>
          </>
        ) : (
          <span className="font-mono text-[10px] text-tdf-muted">N/D</span>
        )}
      </div>

      <div className="hidden sm:block text-right shrink-0 w-16 font-mono text-xs text-tdf-muted">
        {player.league_points != null
          ? `${player.league_points.toLocaleString("es-CL")} LP`
          : "—"}
      </div>

      <div className="hidden md:block text-right shrink-0 w-20 font-mono text-xs">
        {matchStats?.win_rate != null ? (
          <span className="text-tdf-magenta font-semibold">
            {Math.round(matchStats.win_rate * 100)}% WR
          </span>
        ) : (
          <span className="text-tdf-muted">N/D</span>
        )}
      </div>

      <button
        onClick={() => onOpenHistory(player)}
        className="font-mono text-[10px] border border-tdf-line hover:border-tdf-magenta hover:text-white transition-colors px-2 py-1 shrink-0"
      >
        Ver →
      </button>
    </div>
  );
}

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
        <p className="text-sm text-tdf-muted font-body">
          Tu CFN {registration.cfn_id} está pendiente de revisión por staff. Te
          vas a ver en la lista una vez que se apruebe.
        </p>
      </div>
    );
  }

  if (registration?.status === "approved") return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="hud-frame bg-tdf-charcoal px-5 py-4 mb-8 flex flex-wrap items-end gap-3"
    >
      <div className="flex-1 min-w-[200px]">
        <p className="font-mono text-xs uppercase text-tdf-muted mb-2">
          Súmate a la lista
        </p>
        <input
          value={cfnId}
          onChange={(e) => setCfnId(e.target.value)}
          placeholder="Tu CFN ID (solo números)"
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-mono"
        />
        {registration?.status === "rejected" && (
          <p className="font-mono text-[11px] text-tdf-muted mt-1">
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
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(7);
  const [historyPlayer, setHistoryPlayer] = useState<CFNPlayer | null>(null);
  const [myRegistration, setMyRegistration] = useState<CFNRegistration | null>(
    null,
  );

  // vista "Galería" (las cards con foto, la estética) es la que se ve
  // por defecto — "Lista" es la alternativa práctica con buscador y
  // filtros, para cuando alguien quiere comparar jugadores rápido en
  // vez de disfrutar las fotos (conversación de diseño, 22-08-2026).
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<"all" | "master" | "no-master">(
    "all",
  );
  const [sortBy, setSortBy] = useState<"lp" | "mr" | "name">("lp");

  function refreshPlayers() {
    listCfnPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]));
  }

  useEffect(() => {
    refreshPlayers();
    setPlayersLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleUploadBackground(
    cfnId: string,
    file: File,
    isOwn: boolean,
  ) {
    if (!token) return;
    try {
      const resized = await resizeImageFile(file, CARD_BACKGROUND_SIZE, 0.82);
      // se calcula sobre la imagen YA redimensionada (lo que realmente
      // se va a mostrar), una sola vez acá — no en cada carga de
      // página para cada visitante (ver getImageBrightness)
      const brightness = await getImageBrightness(resized);
      if (isOwn) {
        await updateMyCardBackground(token, resized, brightness);
      } else {
        await setPlayerCardBackground(token, cfnId, resized, brightness);
      }
      refreshPlayers();
    } catch {
      // silencioso a propósito — si falla, la card simplemente no
      // cambia, no hay nada crítico que perder acá
    }
  }

  async function handleRemoveBackground(cfnId: string) {
    if (!token) return;
    try {
      await removePlayerCardBackground(token, cfnId);
      refreshPlayers();
    } catch {
      // idem
    }
  }

  const displayedPlayers = useMemo(() => {
    let result = players;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          p.character_name?.toLowerCase().includes(q),
      );
    }

    if (rankFilter === "master") {
      result = result.filter((p) => p.master_rating != null);
    } else if (rankFilter === "no-master") {
      result = result.filter((p) => p.master_rating == null);
    }

    result = [...result];
    if (sortBy === "mr") {
      // sin MR va al final, no antes que alguien con rango real
      result.sort((a, b) => (b.master_rating ?? -1) - (a.master_rating ?? -1));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.display_name.localeCompare(b.display_name));
    } else {
      result.sort((a, b) => (b.league_points ?? -1) - (a.league_points ?? -1));
    }

    return result;
  }, [players, searchQuery, rankFilter, sortBy]);

  const topMrCfnId = useMemo(() => {
    let best: { cfnId: string; mr: number } | null = null;
    for (const p of players) {
      if (p.master_rating != null && (!best || p.master_rating > best.mr)) {
        best = { cfnId: p.cfn_id, mr: p.master_rating };
      }
    }
    return best?.cfnId ?? null;
  }, [players]);

  const records = useMemo(() => {
    return RECORD_CATEGORIES.map((cat) => {
      let winner: CFNPlayer | null = null;
      let bestValue: number | null = null;
      for (const p of players) {
        const trackedMatches = matchStats.get(p.cfn_id)?.total_matches ?? 0;
        if (trackedMatches < MIN_MATCHES_FOR_RECORDS) continue;

        const value = p[cat.key];
        if (value != null && (bestValue == null || value > bestValue)) {
          winner = p;
          bestValue = value;
        }
      }
      return { ...cat, winner, value: bestValue };
    });
  }, [players, matchStats]);

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
                    : "border-tdf-line text-tdf-muted hover:text-white"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-tdf-muted mb-1 max-w-xl font-body">
        Rango, LP y personaje principal de la comunidad. TDF y la escena
        chilena, todos en el mismo pozo. Se actualiza cada hora, no en vivo. El
        resumen de arriba y las tarjetas de abajo son de los últimos {days} día
        {days > 1 ? "s" : ""}.
      </p>
      <p className="font-body text-xs text-tdf-muted mb-6">
        La etiqueta <span className="text-tdf-purple font-medium">TDF</span>{" "}
        marca a quienes son parte del staff/colaboradores del club, el resto es
        comunidad. Las tarjetas con{" "}
        <span className="text-tdf-purple font-medium">Liquipedia ↗</span> son
        clickeables, llevan a su perfil competitivo. Cada quien puede subir su
        propia foto de fondo desde su card.
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

      {!playersLoading && records.some((r) => r.winner) && (
        <div className="mb-12">
          <p className="font-mono text-xs uppercase text-tdf-muted mb-3">
            // Records: promedio de las últimas 100 partidas, mín.{" "}
            {MIN_MATCHES_FOR_RECORDS} partidas trackeadas por TDF
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {records.map((r) => (
              <RecordCard
                key={r.key}
                label={r.label}
                unit={r.unit}
                winner={r.winner}
                value={r.value}
                decimals={r.decimals}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-3 mb-4">
        <div className="flex gap-1 font-mono text-xs">
          {(["gallery", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                viewMode === mode
                  ? "border-tdf-magenta text-tdf-magenta"
                  : "border-tdf-line text-tdf-muted hover:text-white"
              }`}
            >
              {mode === "gallery" ? "Galería" : "Lista"}
            </button>
          ))}
        </div>

        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar jugador o personaje..."
          className="bg-tdf-dark border border-tdf-line px-3 py-1.5 text-sm font-body flex-1 min-w-[160px]"
        />

        <select
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value as typeof rankFilter)}
          className="bg-tdf-dark border border-tdf-line px-2 py-1.5 text-xs font-mono uppercase"
        >
          <option value="all">Todos los rangos</option>
          <option value="master">Solo Master</option>
          <option value="no-master">Sin Master todavía</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-tdf-dark border border-tdf-line px-2 py-1.5 text-xs font-mono uppercase"
        >
          <option value="lp">Ordenar por LP</option>
          <option value="mr">Ordenar por MR</option>
          <option value="name">Alfabético</option>
        </select>
      </div>

      {!playersLoading && displayedPlayers.length === 0 && (
        <p className="font-body text-sm text-tdf-muted py-8 text-center">
          Ningún jugador coincide con esa búsqueda/filtro.
        </p>
      )}

      {viewMode === "gallery" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPlayers.map((p) => (
            <PlayerCard
              key={p.cfn_id}
              player={p}
              profilesLoading={playersLoading}
              isTopMr={p.cfn_id === topMrCfnId}
              matchStats={matchStats.get(p.cfn_id)}
              statsLoading={statsLoading}
              isOwnCard={
                myRegistration?.status === "approved" &&
                myRegistration.cfn_id === p.cfn_id
              }
              isStaff={!!user?.is_staff}
              onOpenHistory={setHistoryPlayer}
              onUploadBackground={handleUploadBackground}
              onRemoveBackground={handleRemoveBackground}
            />
          ))}
        </div>
      ) : (
        <div className="hud-frame bg-tdf-charcoal overflow-hidden">
          {displayedPlayers.map((p) => (
            <PlayerListRow
              key={p.cfn_id}
              player={p}
              isTopMr={p.cfn_id === topMrCfnId}
              matchStats={matchStats.get(p.cfn_id)}
              onOpenHistory={setHistoryPlayer}
            />
          ))}
        </div>
      )}

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
