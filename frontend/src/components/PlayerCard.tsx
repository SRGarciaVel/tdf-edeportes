import { useRef, useState } from "react";
import InitialsAvatar from "./InitialsAvatar";
import Skeleton from "./Skeleton";
import { characterColorClass, characterColorHex } from "../lib/characterColors";
import type { CFNMatchStats, CFNPlayer } from "../lib/types";

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

export function PlayerAvatarRing({ player }: { player: CFNPlayer }) {
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

export function CardBackgroundPhoto({
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

export default function PlayerCard({
  player,
  profilesLoading,
  isTopMr,
  matchStats,
  statsLoading,
  isOwnCard,
  isStaff,
  onOpenHistory = () => {},
  onUploadBackground = () => {},
  onRemoveBackground = () => {},
  preview = false,
}: {
  player: CFNPlayer;
  profilesLoading: boolean;
  isTopMr: boolean;
  matchStats?: CFNMatchStats;
  statsLoading: boolean;
  isOwnCard: boolean;
  isStaff: boolean;
  onOpenHistory?: (player: CFNPlayer) => void;
  onUploadBackground?: (cfnId: string, file: File, isOwn: boolean) => void;
  onRemoveBackground?: (cfnId: string) => void;
  /** true en la vista previa en vivo de /perfil (ver PerfilPage.tsx) —
   * misma card real, mismos flip/fade y colores, pero sin los botones
   * de subir/sacar foto superpuestos (esos ya viven en el formulario
   * de al lado en esa página, no tiene sentido duplicarlos encima de
   * la preview). El resto del comportamiento (click para dar vuelta,
   * hover en compus con mouse) queda igual, así la vista previa es de
   * verdad la misma experiencia que ve cualquier visitante. */
  preview?: boolean;
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
        canUpload={!preview && (isOwnCard || isStaff)}
        canRemove={!preview && isStaff}
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
    <span className="bg-tdf-charcoal px-2 font-mono text-[10px] uppercase text-tdf-magenta shrink-0">
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

  // solo se muestra en la cara/estado que ya trae stats a la vista
  // (nunca en la cara de identidad de la card giratoria) — es
  // contenido de "conocé más a la persona", va junto al resto de datos
  // de stats, no junto al nombre.
  const bioLine = player.bio && (
    <p className="font-body text-xs text-tdf-muted italic leading-snug [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
      "{player.bio}"
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
          <div className="flex items-center gap-2.5 mb-2.5">
            {profilesLoading ? (
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            ) : (
              <PlayerAvatarRing player={player} />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-base leading-tight flex items-center gap-1.5">
                <span className="truncate">{player.display_name}</span>
                {tdfBadge}
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
          {bioLine && <div className="mt-1.5">{bioLine}</div>}
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
    // wrapper nuevo, sin la clase que detecta el hover — los botones de
    // subir/sacar foto viven acá afuera, como hermanos verdaderos de
    // .player-card-flip-group (no adentro de él). Antes vivían adentro
    // (aunque ya no adentro de player-card-front específicamente), así
    // que pasar el mouse por "Reemplazar"/"Quitar" SEGUÍA contando como
    // "estar sobre la card" para el hover — disparaba el giro igual, y
    // la card se quedaba trabada mostrando la cara de atrás después de
    // usarlos (bug real reportado por Seba, 22-08-2026, segunda vuelta
    // del mismo problema).
    <div className="relative">
      <div
        className={`${cardOuterClassName} player-card-flip-group cursor-pointer ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((v) => !v)}
      >
        <div className="relative w-full min-h-[210px]">
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
              <div className="flex items-center gap-2.5">
                {profilesLoading ? (
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                ) : (
                  <PlayerAvatarRing player={player} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-base leading-tight flex items-center gap-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_10px_rgba(0,0,0,0.7)]">
                    <span className="truncate">{player.display_name}</span>
                    {tdfBadge}
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
              {bioLine}
              <MatchStatsRow stats={matchStats} loading={statsLoading} />
              {footerRow}
            </div>
          </div>
        </div>
      </div>

      {/* botones de subir/sacar foto — HERMANOS de .player-card-flip-group,
          no adentro de él (ver comentario grande más arriba, dónde
          empieza este return). Así pasar el mouse por
          "Reemplazar"/"Quitar" nunca cuenta como "estar sobre la card"
          para la regla de hover del giro. */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <div className="pointer-events-auto">{cardActions}</div>
      </div>
    </div>
  );
}
