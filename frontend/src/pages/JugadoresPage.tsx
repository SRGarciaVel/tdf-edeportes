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
        <p className="font-display font-bold text-sm truncate flex items-center gap-1.5">
          {player.display_name}
          {player.is_tdf && (
            <span className="font-mono text-[9px] uppercase text-tdf-purple shrink-0">
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

function MatchStatsRow({
  stats,
  loading,
}: {
  stats?: CFNMatchStats;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-3 w-40" />;
  }

  if (!stats || stats.total_matches === 0) {
    return (
      <p className="font-mono text-[11px] text-tdf-muted">
        Sin partidas en este período
      </p>
    );
  }

  const entries = Object.entries(stats.characters);
  const topThree = entries.slice(0, 3);
  const rest = entries.length - topThree.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {stats.win_rate != null && (
          <span
            className="inline-flex items-center gap-1.5 bg-tdf-magenta/25 border border-tdf-magenta px-2.5 py-1 font-mono font-bold text-xs"
            style={{
              clipPath: "polygon(0 6px, 6px 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            {Math.round(stats.win_rate * 100)}% WR 🔥
          </span>
        )}
        <span className="font-mono text-xs text-white">
          {stats.wins}W • {stats.losses}L
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {topThree.map(([name, count]) => (
          <span
            key={name}
            className="font-mono text-[10px] bg-black/35 border border-white/15 px-2 py-0.5"
            style={{
              clipPath: "polygon(0 4px, 4px 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            <span className={characterColorClass(name)}>{name}</span>{" "}
            <span className="text-tdf-muted">×{count}</span>
          </span>
        ))}
        {rest > 0 && (
          <span
            className="font-mono text-[10px] bg-black/35 border border-white/15 px-2 py-0.5 text-tdf-muted"
            style={{
              clipPath: "polygon(0 4px, 4px 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            +{rest}
          </span>
        )}
      </div>
    </div>
  );
}

function PlayerAvatarRing({ player }: { player: CFNPlayer }) {
  const ringColor = characterColorHex(player.character_name);
  return (
    <div
      className="w-10 h-10 rounded-full p-[2px] shrink-0"
      style={{
        background: `conic-gradient(${ringColor}, #14101a, ${ringColor})`,
        boxShadow: `0 0 10px -2px ${ringColor}73`,
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
          <InitialsAvatar seed={player.display_name} size={7} />
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
  blurred = false,
}: {
  url: string;
  brightness: number | null;
  /** true en la cara de atrás de la card giratoria — cada cara tiene su
   * propia copia de la foto (ver PlayerCard), así el blur nunca se
   * "escapa" hacia la cara de adelante. filter directo sobre la imagen
   * en vez de backdrop-filter en el panel de texto: más simple, mejor
   * soporte de navegadores, y ya no hace falta que el panel tenga su
   * propia opacidad para que el blur "se note" (conversación de
   * diseño, 22-08-2026, probado primero en teaser HTML interactivo). */
  blurred?: boolean;
}) {
  // mismo mapeo probado en el teaser HTML: foto clara -> overlay más
  // fuerte (se atenúa más), foto oscura -> overlay más suave (se deja
  // ver con más fuerza). El color del texto nunca cambia, solo cuánto
  // se ve la foto. brightness null (fotos subidas antes de que
  // existiera este campo) cae a un valor medio, ni muy fuerte ni muy
  // suave.
  //
  // × 0.5 agregado a pedido de Seba (22-08-2026): el rango original
  // (15%-70%) dejaba la foto muy apagada — quería colores más vivos,
  // aunque sea a costa de un poco menos de contraste de legibilidad.
  // Nuevo rango: ~7.5%-35%. En la cara de atrás (blurred=true) se
  // reduce un poco más — el blur ya aporta su propia protección de
  // legibilidad, no hace falta tanto oscurecimiento encima.
  const overlayAlpha =
    (0.15 + (brightness ?? 0.45) * 0.55) * (blurred ? 0.35 : 0.5);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.85,
        filter: blurred ? "blur(10px) saturate(1.1)" : undefined,
        transform: blurred ? "scale(1.15)" : undefined,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          // tinte de marca también a la mitad (era 0.35/0.45), mismo
          // pedido de Seba: menos tinte, que se note más la foto real
          background:
            "linear-gradient(135deg, rgba(196,20,122,0.175), rgba(91,42,134,0.225))",
          mixBlendMode: "color",
        }}
      />
      {/* atenuación adaptativa según el brillo real de la foto —
          probado primero con un análisis real (canvas) en un teaser
          HTML antes de meterlo acá (conversación de diseño,
          20-08-2026). */}
      <div
        className="absolute inset-0"
        style={{ background: "#0D0710", opacity: overlayAlpha }}
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
    <div className="absolute top-2 right-2 z-20 flex gap-1.5">
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
  const [flipped, setFlipped] = useState(false);
  const hasPhoto = !!player.card_background_url;
  const hasStats =
    !player.last_error &&
    (player.league_points != null || player.character_name);

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const cardActions = (
    <>
      <CardBackgroundActions
        canUpload={isOwnCard || isStaff}
        canRemove={isStaff}
        hasPhoto={hasPhoto}
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
    </>
  );

  const tdfBadge = player.is_tdf && (
    <span className="bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-purple">
      TDF
    </span>
  );

  const rankBlock = profilesLoading ? (
    <Skeleton className="h-6 w-32" />
  ) : hasStats ? (
    <div className="flex items-center gap-2">
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
        <span className="font-body text-xs text-tdf-muted [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
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
    <span className="font-body text-xs uppercase text-tdf-muted border border-tdf-line px-2 py-1 inline-block">
      Próximamente
    </span>
  );

  const lpLine = hasStats && player.league_points != null && (
    <p className="font-body text-xs text-tdf-muted [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
      <span className="font-semibold">
        {player.league_points.toLocaleString("es-CL")}
      </span>{" "}
      LP
    </p>
  );

  const footerRow = (
    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 font-body text-[11px] text-tdf-muted">
      <span className="opacity-55 truncate">
        CFN {player.cfn_id}
        {player.updated_at && (
          <span className="opacity-70">
            {" "}
            · {relativeTime(player.updated_at)}
          </span>
        )}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {player.liquipedia_url && (
          <a
            href={player.liquipedia_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-tdf-purple hover:text-white font-medium transition-colors"
          >
            Liquipedia ↗
          </a>
        )}
        <button
          onClick={stopAnd(() => onOpenHistory(player))}
          className="font-mono text-[10px] border border-white/25 hover:bg-tdf-purple hover:border-tdf-purple transition-colors px-2 py-1"
        >
          Ver partidas →
        </button>
      </div>
    </div>
  );

  const cardOuterClassName =
    "hud-frame relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-10px_rgba(196,20,122,0.55)]" +
    (isTopMr ? " ring-1 ring-tdf-magenta" : "");

  // sin foto propia: card simple, sin giro — no hay nada que "revelar",
  // el ember de fondo es solo textura, no una foto que valga la pena
  // esconder/mostrar (conversación de diseño, 22-08-2026)
  if (!hasPhoto) {
    return (
      <div
        className={`${cardOuterClassName} bg-tdf-charcoal px-3.5 pt-3.5 pb-3 flex flex-col`}
      >
        <EmberFallback />
        {cardActions}
        <div className="relative z-10">
          <div className="absolute -top-1 right-0 flex gap-2 z-10">
            {tdfBadge}
          </div>
          <div className="flex items-center gap-2.5 mb-2.5">
            {profilesLoading ? (
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            ) : (
              <PlayerAvatarRing player={player} />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-base truncate leading-tight">
                {player.display_name}
              </p>
              {profilesLoading ? (
                <Skeleton className="h-3 w-16 mt-1" />
              ) : (
                hasStats &&
                player.character_name && (
                  <p
                    className={`font-body text-xs font-medium mt-0.5 ${characterColorClass(player.character_name)}`}
                  >
                    {player.character_name}
                  </p>
                )
              )}
            </div>
          </div>
          <div className="mb-1">{rankBlock}</div>
          {lpLine}
          <div className="mt-2.5">
            <MatchStatsRow stats={matchStats} loading={statsLoading} />
          </div>
          <div className="mt-2.5">{footerRow}</div>
        </div>
      </div>
    );
  }

  // con foto propia: card giratoria — cara de adelante con la foto
  // nítida (identidad), cara de atrás con la foto borrosa (stats). Gira
  // con click/tap en CUALQUIER dispositivo (el onClick de acá abajo), Y
  // ADEMÁS con hover en compus con mouse real (.player-card-flip-group,
  // ver la regla @media (hover: hover) en index.css) — probado primero
  // en un teaser HTML interactivo antes de meterlo acá, 22-08-2026.
  //
  // Cambiado de giro 3D a fundido/aparición en el mismo lugar, a
  // pedido de Seba (22-08-2026, tras probar el giro y decidir que
  // prefería este mecanismo — mismo tipo de transición que un ejemplo
  // de referencia que mandó: opacity 0->1 + escala leve, no rotateY).
  // Sigue funcionando igual con click/tap en cualquier dispositivo y
  // hover en compus con mouse real (clases .player-card-front/.-back +
  // regla en index.css), solo cambió CÓMO se ve la transición.
  const cardFaceTransition =
    "absolute inset-0 transition-[opacity,transform] duration-[600ms] px-3.5 pt-3.5 pb-3 flex flex-col bg-tdf-charcoal overflow-hidden";
  const easeStyle = {
    transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
  };

  return (
    <div
      className={`${cardOuterClassName} player-card-flip-group cursor-pointer ${flipped ? "flipped" : ""}`}
      onClick={() => setFlipped((v) => !v)}
    >
      <div className="relative w-full min-h-[210px]">
        {/* botones de subir/sacar foto — a propósito FUERA de las dos
            caras (no adentro de player-card-front), como hermano con
            su propio z-index. Si vivían adentro de la cara de
            adelante, pasar el mouse para llegar a ellos disparaba la
            misma transición que los desvanecía junto con el resto de
            esa cara — quedaban imposibles de clickear (bug real
            reportado por Seba, 22-08-2026). Así quedan fijos siempre
            arriba, sin importar qué cara se esté mostrando. */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="pointer-events-auto">{cardActions}</div>
        </div>

        {/* cara de adelante: identidad, foto nítida. Sin el indicio
            "Ver stats" que había antes — Seba lo sacó, se veía mal
            (22-08-2026) */}
        <div
          className={`player-card-front ${cardFaceTransition}`}
          style={easeStyle}
        >
          <CardBackgroundPhoto
            url={player.card_background_url!}
            brightness={player.card_background_brightness}
          />
          <div className="relative z-10 flex flex-col h-full">
            <div className="absolute -top-1 right-0 flex gap-2 z-10">
              {tdfBadge}
            </div>
            <div className="flex items-center gap-2.5">
              {profilesLoading ? (
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              ) : (
                <PlayerAvatarRing player={player} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-base truncate leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_10px_rgba(0,0,0,0.7)]">
                  {player.display_name}
                </p>
                {profilesLoading ? (
                  <Skeleton className="h-3 w-16 mt-1" />
                ) : (
                  hasStats &&
                  player.character_name && (
                    <p
                      className={`font-body text-xs font-medium mt-0.5 uppercase tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_10px_rgba(0,0,0,0.7)] ${characterColorClass(player.character_name)}`}
                    >
                      {player.character_name}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* cara de atrás: stats, foto borrosa */}
        <div
          className={`player-card-back ${cardFaceTransition} opacity-0 scale-[0.96] pointer-events-none`}
          style={easeStyle}
        >
          <CardBackgroundPhoto
            url={player.card_background_url!}
            brightness={player.card_background_brightness}
            blurred
          />
          <div className="relative z-10 flex flex-col h-full justify-center gap-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_10px_rgba(0,0,0,0.7)]">
            <div>{rankBlock}</div>
            {lpLine}
            <MatchStatsRow stats={matchStats} loading={statsLoading} />
            {footerRow}
          </div>
        </div>
      </div>
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
