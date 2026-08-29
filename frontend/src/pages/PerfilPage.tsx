import { Camera, ImagePlus, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PlayerCard, { CardBackgroundPhoto } from "../components/PlayerCard";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import SkillRadarChart from "../components/SkillRadarChart";
import Skeleton from "../components/Skeleton";
import {
  getMatchStats,
  getMyCfnRegistration,
  getPlayerSkills,
  listCfnPlayers,
  updateMyCardBackground,
  updateMyProfile,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { getImageBrightness, resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type {
  CFNMatchStats,
  CFNPlayer,
  CFNRegistration,
  SkillAxis,
} from "../lib/types";

const BIO_MAX_LENGTH = 280;
const AVATAR_SIZE = 160;
// mismo tamaño que usa /jugadores para la foto de fondo — si cambia
// ahí, cambiar acá también (ver JugadoresPage.tsx)
const CARD_BACKGROUND_SIZE = 480;
// días fijos para la muestra de W-L en la preview — /jugadores deja
// elegir 1D/3D/7D, acá no hace falta ese control: es solo para que la
// card de vista previa no se vea vacía, no un análisis de verdad
const PREVIEW_STATS_DAYS = 7;

/** Achievements sigue sin mecánica real (pedido explícito de Seba,
 * 28-08-2026: "dejemos un placeholder por mientras, luego las creamos
 * con calma") — a diferencia de /puntos (que muestra un leaderboard
 * placeholder con datos inventados como si fueran reales), acá se
 * muestra honestamente bloqueado: es el perfil de la propia persona,
 * mostrarle logros falsos como "ganados" sería confuso/engañoso de
 * verdad, no solo un molde visual de una tabla genérica. */
function AchievementsPlaceholder() {
  return (
    <div className="hud-frame bg-tdf-charcoal px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase text-tdf-muted">
          Achievements
        </h2>
        <span className="font-mono text-[10px] text-tdf-magenta uppercase">
          Muy pronto
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-full bg-tdf-dark border border-tdf-line flex items-center justify-center"
          >
            <Lock size={16} className="text-tdf-muted opacity-50" />
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-tdf-muted mt-4">
        Todavía estamos definiendo cómo se desbloquean. Cuando estén listos, van
        a aparecer acá solos.
      </p>
    </div>
  );
}

/** Perfil propio — bio, avatar, foto de fondo de la card y radar de
 * habilidades, todo con vista previa en vivo (misma card real que se
 * ve en /jugadores, con su flip/fade incluido) para no tener que ir y
 * volver de esa página a cada cambio (pedido de Seba, 28-08-2026). La
 * edición sigue pegando a los mismos endpoints de siempre — lo que
 * cambió acá es la presentación, fusionando dos referencias de diseño
 * que mandó (banner con cover + avatar superpuesto, y panel de
 * radar/achievements al lado) adaptadas a la estética oscura/HUD del
 * sitio, no a los colores claros de esas referencias. */
export default function PerfilPage() {
  const { user, token } = useAuth();
  const [registration, setRegistration] = useState<CFNRegistration | null>(
    null,
  );
  const [player, setPlayer] = useState<CFNPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  const [previewStats, setPreviewStats] = useState<CFNMatchStats>();
  const [previewStatsLoading, setPreviewStatsLoading] = useState(false);
  const [skills, setSkills] = useState<SkillAxis[] | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgBrightness, setBgBrightness] = useState<number | null>(null);
  const [bgSaving, setBgSaving] = useState(false);
  const [bgSaved, setBgSaved] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMyCfnRegistration(token)
      .then(async (reg) => {
        setRegistration(reg);
        if (reg?.status === "approved") {
          const players = await listCfnPlayers();
          const own = players.find((p) => p.cfn_id === reg.cfn_id) ?? null;
          setPlayer(own);
          setBio(own?.bio ?? "");
          setAvatarPreview(own?.avatar_url ?? null);
          setBgPreview(own?.card_background_url ?? null);
          setBgBrightness(own?.card_background_brightness ?? null);

          setPreviewStatsLoading(true);
          setSkillsLoading(true);
          getMatchStats(reg.cfn_id, PREVIEW_STATS_DAYS)
            .then(setPreviewStats)
            .finally(() => setPreviewStatsLoading(false));
          getPlayerSkills(reg.cfn_id)
            .then(setSkills)
            .finally(() => setSkillsLoading(false));
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAvatarFile(file: File) {
    try {
      const resized = await resizeImageFile(file, AVATAR_SIZE, 0.85);
      setNewAvatar(resized);
      setAvatarPreview(resized);
      setSaved(false);
    } catch {
      setError("No se pudo procesar esa imagen. Probá con otra.");
    }
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyProfile(token, {
        bio: bio.trim().length > 0 ? bio.trim() : null,
        ...(newAvatar !== null ? { avatarOverride: newAvatar } : {}),
      });
      setNewAvatar(null);
      setSaved(true);
    } catch {
      setError("No se pudo guardar. Probá de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  }

  // foto de fondo — endpoint propio (PATCH /cfn/register/me/background,
  // ya existía desde /jugadores), self-contained: sube y guarda en el
  // mismo paso, no queda pendiente de "Guardar" como bio/avatar. El
  // preview (banner + card de la derecha) se actualiza apenas se
  // resuelve el resize, sin esperar la respuesta del servidor.
  async function handleBackgroundFile(file: File) {
    if (!token) return;
    setBgSaving(true);
    setBgError(null);
    setBgSaved(false);
    try {
      const resized = await resizeImageFile(file, CARD_BACKGROUND_SIZE, 0.82);
      const brightness = await getImageBrightness(resized);
      setBgPreview(resized);
      setBgBrightness(brightness);
      await updateMyCardBackground(token, resized, brightness);
      setBgSaved(true);
    } catch {
      setBgError("No se pudo subir esa imagen. Probá con otra.");
    } finally {
      setBgSaving(false);
    }
  }

  if (!user) {
    return (
      <Layout>
        <SectionLabel index="P1">Mi perfil</SectionLabel>
        <p className="text-tdf-muted font-body text-sm">
          Necesitas iniciar sesión con Twitch para ver y editar tu perfil.
        </p>
      </Layout>
    );
  }

  const approved = !loading && registration?.status === "approved" && player;

  // player + los cambios todavía no guardados — es lo que ve la card
  // de vista previa y el banner, así que se actualiza en cada tecla /
  // cada imagen elegida, no solo después de "Guardar"
  const previewPlayer: CFNPlayer | null = player && {
    ...player,
    bio: bio.trim().length > 0 ? bio.trim() : null,
    avatar_url: avatarPreview,
    card_background_url: bgPreview,
    card_background_brightness: bgBrightness,
  };

  return (
    <Layout>
      <SectionLabel index="P1">Mi perfil</SectionLabel>

      {loading && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md flex flex-col gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!loading && !registration && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md">
          <p className="text-tdf-muted font-body text-sm mb-3">
            Todavía no te sumaste a la lista de jugadores. Registrá tu CFN ID
            desde{" "}
            <Link to="/jugadores" className="text-tdf-magenta hover:underline">
              Jugadores
            </Link>{" "}
            para poder personalizar tu perfil acá.
          </p>
        </div>
      )}

      {!loading && registration?.status === "pending" && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md">
          <p className="font-mono text-xs uppercase text-tdf-magenta mb-1">
            Solicitud enviada
          </p>
          <p className="text-tdf-muted font-body text-sm">
            Tu CFN {registration.cfn_id} está pendiente de revisión por staff.
            Vas a poder editar tu perfil una vez que se apruebe.
          </p>
        </div>
      )}

      {!loading && registration?.status === "rejected" && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md">
          <p className="text-tdf-muted font-body text-sm mb-3">
            Tu solicitud anterior no fue aprobada. Puedes intentar de nuevo
            desde{" "}
            <Link to="/jugadores" className="text-tdf-magenta hover:underline">
              Jugadores
            </Link>
            .
          </p>
        </div>
      )}

      {approved && previewPlayer && (
        <div className="flex flex-col gap-6">
          {/* banner — la propia foto de fondo de la card como cover,
              avatar grande superpuesto (referencia: portfolia) */}
          <div className="hud-frame bg-tdf-charcoal overflow-hidden">
            <div className="relative h-32 sm:h-44 bg-gradient-to-br from-tdf-purple/30 to-tdf-magenta/20">
              {bgPreview && (
                <CardBackgroundPhoto
                  url={bgPreview}
                  brightness={bgBrightness}
                />
              )}
              {/* editor del banner encima de la propia foto — antes
                  solo vivía como sección aparte más abajo y encima
                  escondida para staff (se asumía que Staff ya podía
                  editar cualquier card desde /jugadores, pero eso es
                  para la card de OTROS: la propia banner/foto de fondo
                  la puede cambiar cualquiera, sea staff o no). Pedido
                  de Seba (29-08-2026). */}
              <button
                onClick={() => bgFileInputRef.current?.click()}
                disabled={bgSaving}
                className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 font-body text-[11px] font-medium text-white bg-black/50 hover:bg-black/70 border border-white/20 hover:border-tdf-magenta px-2.5 py-1.5 rounded backdrop-blur-sm transition-colors disabled:opacity-50"
              >
                <ImagePlus size={13} />
                {bgSaving
                  ? "Subiendo..."
                  : bgPreview
                    ? "Cambiar banner"
                    : "Subir banner"}
              </button>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBackgroundFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            {/* items-start (no items-end) + el -mt-12 vive en el propio
                avatar, no en toda la fila — así el nombre no queda
                pegado al borde del banner (bug reportado 29-08-2026):
                antes, al alinear todo por abajo contra el avatar, el
                texto terminaba a centímetros del corte del banner */}
            <div className="px-6 pb-5 pt-3 relative z-10 flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="relative shrink-0 -mt-12">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-tdf-charcoal bg-tdf-dark">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar seed={player.display_name} size={20} />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Cambiar foto de perfil"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-tdf-magenta hover:bg-tdf-purple transition-colors flex items-center justify-center border-2 border-tdf-charcoal"
                >
                  <Camera size={13} className="text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarFile(file);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex-1 pt-3 sm:pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-bold text-xl">
                    {player.display_name}
                  </h1>
                  {user.is_staff && (
                    <span className="text-xs bg-tdf-magenta/20 text-tdf-magenta px-2 py-0.5 rounded">
                      Staff
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
              </div>
            </div>
          </div>

          {/* dos columnas: edición a la izquierda, preview + radar a
              la derecha (sticky en desktop, para no perderla al
              scrollear el formulario) */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="flex flex-col gap-6">
              <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase text-tdf-muted mb-1.5 block">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value.slice(0, BIO_MAX_LENGTH));
                      setSaved(false);
                    }}
                    placeholder="Cuéntanos algo de ti: main, estilo de juego, lo que quieras..."
                    rows={3}
                    className="w-full bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body resize-none"
                  />
                  <p className="font-mono text-[10px] text-tdf-muted mt-1 text-right">
                    {bio.length}/{BIO_MAX_LENGTH}
                  </p>
                </div>

                {error && (
                  <p className="text-red-400 text-xs font-body">{error}</p>
                )}
                {saved && !error && (
                  <p className="text-emerald-400 text-xs font-body">
                    Perfil guardado.
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="font-body text-sm px-4 py-2 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <Link
                    to="/jugadores"
                    className="font-mono text-xs text-tdf-muted hover:text-white"
                  >
                    Ver la lista completa de jugadores →
                  </Link>
                </div>
              </div>

              <p className="font-mono text-[10px] text-tdf-muted flex flex-wrap items-center gap-x-1.5">
                {bgError && <span className="text-red-400">{bgError}</span>}
                {bgSaved && !bgError && (
                  <span className="text-emerald-400">Banner guardado.</span>
                )}
                <span>
                  El botón de "Cambiar banner" arriba en la foto de fondo edita
                  esa misma imagen. Si necesitas sacarla del todo (no
                  reemplazarla), pídeselo a staff.
                </span>
              </p>

              <AchievementsPlaceholder />
            </div>

            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <div>
                <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
                  Vista previa. Así se ve tu card pública
                </p>
                <PlayerCard
                  player={previewPlayer}
                  profilesLoading={false}
                  isTopMr={false}
                  matchStats={previewStats}
                  statsLoading={previewStatsLoading}
                  isOwnCard={false}
                  isStaff={false}
                  preview
                />
                <p className="font-mono text-[10px] text-tdf-muted mt-2 text-center">
                  Toca la card para ver la cara de atrás
                </p>
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
      )}
    </Layout>
  );
}
