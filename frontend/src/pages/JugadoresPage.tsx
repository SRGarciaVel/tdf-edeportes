import { useEffect, useMemo, useRef, useState } from "react";
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
  removePlayerCardBackground,
  setPlayerCardBackground,
  updateMyCardBackground,
} from "../lib/api";
import { characterColorClass, characterColorHex } from "../lib/characterColors";
import { getImageBrightness, resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type { CFNMatchStats, CFNPlayer, CFNRegistration } from "../lib/types";

const DAY_OPTIONS = [1, 3, 7] as const;
// mínimo de partidas decididas para que alguien pueda ganar el KPI de
// "mejor win rate" — sin esto, alguien con 1 partida jugada y 1-0 le
// gana a todo el grupo con un "100%" que no dice nada
const MIN_MATCHES_FOR_BEST_WR = 3;
// la foto de fondo es más grande que un avatar (ocupa media card), así
// que se redimensiona a más resolución que los 120px del avatar
const CARD_BACKGROUND_SIZE = 480;

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
      <p className="font-mono text-[11px] text-tdf-muted border-t border-tdf-line/60 mt-3 pt-2">
        Sin partidas en este período
      </p>
    );
  }

  const entries = Object.entries(stats.characters);
  const topThree = entries.slice(0, 3);
  const rest = entries.length - topThree.length;

  return (
    <div className="font-mono text-[11px] text-tdf-muted border-t border-tdf-line/60 mt-3 pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-white">
          {stats.wins}W-{stats.losses}L
        </span>
        {stats.win_rate != null && (
          <span className="text-tdf-magenta">
            {Math.round(stats.win_rate * 100)}% WR
          </span>
        )}
        <span className="text-tdf-muted">·</span>
        <span className="flex flex-wrap items-center gap-x-1.5">
          {topThree.map(([name, count], i) => (
            <span key={name}>
              <span className={characterColorClass(name)}>{name}</span>
              <span className="text-tdf-muted"> x{count}</span>
              {i < topThree.length - 1 && (
                <span className="text-tdf-muted">,</span>
              )}
            </span>
          ))}
          {rest > 0 && <span className="text-tdf-muted">+{rest} más</span>}
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

function PlayerAvatarRing({ player }: { player: CFNPlayer }) {
  const ringColor = characterColorHex(player.character_name);
  return (
    <div
      className="w-14 h-14 rounded-full p-[3px] shrink-0"
      style={{
        background: `conic-gradient(${ringColor}, #14101a, ${ringColor})`,
      }}
    >
      {player.avatar_url ? (
        <img
          src={player.avatar_url}
          alt={player.display_name}
          className="w-full h-full rounded-full object-cover border-2 border-tdf-charcoal"
        />
      ) : (
        <div className="w-full h-full rounded-full border-2 border-tdf-charcoal overflow-hidden flex items-center justify-center bg-tdf-dark">
          <InitialsAvatar seed={player.display_name} size={10} />
        </div>
      )}
    </div>
  );
}

function FlameIcon({ dim, gradientId }: { dim: boolean; gradientId: string }) {
  return (
    <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C10 6 6 8 6 13a6 6 0 0 0 12 0c0-2-1-3-2-4 0 2-1 3-2 2 1-3-1-5-2-9Z"
        fill={dim ? "#aba4b7" : `url(#${gradientId})`}
        stroke={dim ? "#aba4b7" : "#ff6b35"}
        strokeWidth="0.5"
        opacity={dim ? 0.35 : 1}
      />
      {!dim && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#C4147A" />
          </linearGradient>
        </defs>
      )}
    </svg>
  );
}

function EmberFallback() {
  return (
    <svg
      className="absolute -right-5 -bottom-5 w-32 h-32 opacity-[0.05] pointer-events-none"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M50 5 C 40 25, 60 30, 55 50 C 70 45, 75 65, 50 95 C 25 65, 30 45, 45 50 C 40 30, 60 25, 50 5 Z"
        fill="#ff6b35"
      />
    </svg>
  );
}

function CardBackgroundPhoto({
  url,
  brightness,
}: {
  url: string;
  brightness: number | null;
}) {
  // mismo mapeo probado en el teaser HTML: foto clara -> overlay más
  // fuerte (se atenúa más), foto oscura -> overlay más suave (se deja
  // ver con más fuerza). El color del texto nunca cambia, solo cuánto
  // se ve la foto. brightness null (fotos subidas antes de que
  // existiera este campo) cae a un valor medio, ni muy fuerte ni muy
  // suave.
  const overlayAlpha = 0.15 + (brightness ?? 0.45) * 0.55;

  return (
    // altura FIJA a propósito, no inset-0 con una diagonal — la card
    // varía de altura según cuánto contenido tenga cada jugador
    // (stats, badge de TDF, etc.), así que una diagonal de esquina a
    // esquina "filtraba" la foto por todo el ancho en la zona de abajo
    // (W-L, CFN, Liquipedia) en las cards más altas, tapando texto de
    // verdad (encontrado por Seba, 20-08-2026). Con altura fija, la
    // foto SIEMPRE queda arriba (zona de identidad: avatar/nombre/MR)
    // y la zona de datos de abajo siempre está sobre charcoal sólido,
    // sin excepción, sin importar la altura total de la card.
    <div
      className="absolute top-0 left-0 right-0 h-32 overflow-hidden pointer-events-none"
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.8,
        WebkitMaskImage: "linear-gradient(100deg, transparent 32%, black 80%)",
        maskImage: "linear-gradient(100deg, transparent 32%, black 80%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(196,20,122,0.35), rgba(91,42,134,0.45))",
          mixBlendMode: "color",
        }}
      />
      {/* atenuación adaptativa según el brillo real de la foto —
          probado primero con un análisis real (canvas) en un teaser
          HTML antes de meterlo acá (conversación de diseño,
          20-08-2026) */}
      <div
        className="absolute inset-0"
        style={{ background: "#0D0710", opacity: overlayAlpha }}
      />
      {/* refuerzo extra: se apaga hacia abajo aunque esté dentro de la
          caja, para que el borde inferior nunca corte la foto de forma
          brusca contra el charcoal sólido de la zona de datos */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 40%, #14101a 100%)",
        }}
      />
    </div>
  );
}

function CardBackgroundActions({
  canUpload,
  canRemove,
  hasPhoto,
  onUploadClick,
  onRemove,
}: {
  canUpload: boolean;
  canRemove: boolean;
  hasPhoto: boolean;
  onUploadClick: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  if (!canUpload && !canRemove) return null;
  return (
    <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {canUpload && (
        <button
          onClick={onUploadClick}
          className="font-body text-[10px] font-medium text-tdf-muted hover:text-white bg-tdf-dark/75 border border-tdf-line hover:border-tdf-magenta px-2 py-1 rounded"
        >
          ↑ {hasPhoto ? "Reemplazar" : "Subir foto"}
        </button>
      )}
      {canRemove && hasPhoto && (
        <button
          onClick={onRemove}
          className="font-body text-[10px] font-medium text-tdf-muted hover:text-red-300 bg-tdf-dark/75 border border-tdf-line hover:border-red-500 px-2 py-1 rounded"
        >
          ✕ Quitar
        </button>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  profilesLoading,
  isTopMr,
  matchStats,
  statsLoading,
  isOwnCard,
  isStaff,
  onOpenHistory,
  onUploadBackground,
  onRemoveBackground,
}: {
  player: CFNPlayer;
  profilesLoading: boolean;
  isTopMr: boolean;
  matchStats?: CFNMatchStats;
  statsLoading: boolean;
  isOwnCard: boolean;
  isStaff: boolean;
  onOpenHistory: (player: CFNPlayer) => void;
  onUploadBackground: (cfnId: string, file: File, isOwn: boolean) => void;
  onRemoveBackground: (cfnId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasStats =
    !player.last_error &&
    (player.league_points != null || player.character_name);

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const content = (
    <>
      {player.card_background_url ? (
        <CardBackgroundPhoto
          url={player.card_background_url}
          brightness={player.card_background_brightness}
        />
      ) : (
        <EmberFallback />
      )}

      <CardBackgroundActions
        canUpload={isOwnCard || isStaff}
        canRemove={isStaff}
        hasPhoto={!!player.card_background_url}
        onUploadClick={stopAnd(() => fileInputRef.current?.click())}
        onRemove={stopAnd(() => onRemoveBackground(player.cfn_id))}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUploadBackground(player.cfn_id, file, isOwnCard);
          e.target.value = "";
        }}
      />

      <div className="relative z-10">
        <div className="absolute -top-1 right-0 flex gap-2 z-10">
          {player.is_tdf && (
            <span className="bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-purple">
              TDF
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          {profilesLoading ? (
            <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          ) : (
            <PlayerAvatarRing player={player} />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-lg truncate leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
              {player.display_name}
            </p>
            {profilesLoading ? (
              <Skeleton className="h-3 w-16 mt-1" />
            ) : (
              hasStats &&
              player.character_name && (
                <p
                  className={`font-body text-sm font-medium mt-0.5 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)] ${characterColorClass(player.character_name)}`}
                >
                  {player.character_name}
                </p>
              )
            )}
          </div>
        </div>

        {profilesLoading ? (
          <Skeleton className="h-6 w-32 mb-3" />
        ) : hasStats ? (
          <div className="flex items-center gap-2 mb-1">
            <FlameIcon dim={!isTopMr} gradientId={`flame-${player.cfn_id}`} />
            {player.master_rating != null ? (
              <>
                <span
                  className={`font-display font-bold leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.5)] ${isTopMr ? "text-white text-[26px]" : "text-tdf-muted text-xl"}`}
                >
                  {player.master_rating}
                </span>
                <span
                  className={`font-body text-[11px] font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,0.5)] ${isTopMr ? "text-[#ff6b35]" : "text-tdf-muted"}`}
                >
                  MR
                </span>
              </>
            ) : (
              <span className="font-body text-xs text-tdf-muted">
                Sin rango de Master todavía
              </span>
            )}
            {isTopMr && (
              <span className="ml-auto font-body text-[11px] font-semibold text-tdf-dark bg-gradient-to-r from-[#ff6b35] to-tdf-magenta px-2.5 py-1 rounded">
                #1 comunidad
              </span>
            )}
          </div>
        ) : (
          <span className="font-body text-xs uppercase text-tdf-muted border border-tdf-line px-2 py-1 inline-block mb-2">
            Próximamente
          </span>
        )}

        {hasStats && player.league_points != null && (
          <p className="font-body text-xs text-tdf-muted mb-3">
            <span className="font-semibold">
              {player.league_points.toLocaleString("es-CL")}
            </span>{" "}
            LP
          </p>
        )}

        <MatchStatsRow
          stats={matchStats}
          loading={statsLoading}
          onOpenHistory={stopAnd(() => onOpenHistory(player))}
        />

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-tdf-line/60 font-body text-[11px] text-tdf-muted">
          <span className="opacity-55">CFN {player.cfn_id}</span>
          {player.liquipedia_url && (
            <span className="text-tdf-purple font-medium">Liquipedia ↗</span>
          )}
          {player.updated_at && (
            <span className="opacity-70">
              {relativeTime(player.updated_at)}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const className =
    "hud-frame bg-tdf-charcoal px-5 pt-5 pb-4 flex flex-col transition-all duration-200 relative overflow-hidden group hover:-translate-y-0.5 hover:border-tdf-magenta hover:shadow-[0_12px_32px_-10px_rgba(196,20,122,0.55)]" +
    (isTopMr ? " border-tdf-magenta" : "");

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

  const sortedPlayers = useMemo(() => sortByLp(players), [players]);

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
        const value = p[cat.key];
        if (value != null && (bestValue == null || value > bestValue)) {
          winner = p;
          bestValue = value;
        }
      }
      return { ...cat, winner, value: bestValue };
    });
  }, [players]);

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
            // Records — promedio de las últimas 100 partidas de cada uno
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

      <div className="grid sm:grid-cols-2 gap-3 pt-3">
        {sortedPlayers.map((p) => (
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
