import { Camera, ImagePlus, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BannerCropModal from "../components/BannerCropModal";
import PlayerCard, { CardBackgroundPhoto } from "../components/PlayerCard";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import SkillRadarChart from "../components/SkillRadarChart";
import Skeleton from "../components/Skeleton";
import SocialLinksEditor from "../components/SocialLinksEditor";
import SocialLinksRow from "../components/SocialLinksRow";
import {
  getMatchStats,
  getMyCfnRegistration,
  getPlayerSkills,
  listCfnPlayers,
  removePlayerCardBackground,
  updateMyCardBackground,
  updateMyProfile,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import {
  getImageBrightness,
  resizeImageFile,
  isAnimatedGif,
  fileToDataUrl,
  MAX_GIF_FILE_SIZE,
} from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type {
  CFNMatchStats,
  CFNPlayer,
  CFNRegistration,
  SkillAxis,
  SocialLink,
} from "../lib/types";

const BIO_MAX_LENGTH = 280;
const AVATAR_SIZE = 160;
// mismo tamaño que usa /jugadores para la foto de fondo de la card
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

/** Perfil propio — bio, avatar, banner de portada (con editor de
 * recorte/zoom estilo Discord, 29-08-2026), foto de fondo de la card
 * (editable directo desde la vista previa en vivo, mismos botones que
 * ya existen en /jugadores) y radar de habilidades. Banner y foto de
 * fondo de la card son campos DISTINTOS a propósito: el banner es solo
 * la portada de esta página, la foto de fondo es la que se ve en la
 * card pública de /jugadores. */
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
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // banner de portada — el archivo elegido pasa primero por
  // BannerCropModal (recorte/zoom), recién ahí se sube. self-contained:
  // guarda apenas se aplica el recorte, no espera al botón "Guardar"
  // de bio/avatar.
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [croppingBannerFile, setCroppingBannerFile] = useState<File | null>(
    null,
  );
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // foto de fondo de la card pública en /jugadores — se edita directo
  // desde los botones de la propia card de vista previa de acá abajo
  // (mismos botones/endpoints que ya existen en /jugadores), no con un
  // formulario aparte
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgBrightness, setBgBrightness] = useState<number | null>(null);

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
          setDisplayName(own?.display_name ?? "");
          setSocialLinks(own?.social_links ?? []);
          setAvatarPreview(own?.avatar_url ?? null);
          setBannerPreview(own?.banner_url ?? null);
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
      if (isAnimatedGif(file)) {
        if (file.size > MAX_GIF_FILE_SIZE) {
          setError("Ese GIF pesa más de 5MB. Prueba con uno más liviano.");
          return;
        }
        // sin canvas de por medio — así el GIF mantiene su animación
        // (ver isAnimatedGif en lib/imageResize.ts)
        const raw = await fileToDataUrl(file);
        setNewAvatar(raw);
        setAvatarPreview(raw);
        setSaved(false);
        return;
      }
      const resized = await resizeImageFile(file, AVATAR_SIZE, 0.85);
      setNewAvatar(resized);
      setAvatarPreview(resized);
      setSaved(false);
    } catch {
      setError("No se pudo procesar esa imagen. Prueba con otra.");
    }
  }

  async function handleSave() {
    if (!token) return;
    const trimmedName = displayName.trim();
    if (trimmedName.length === 0) {
      setNameError("El nombre no puede quedar vacío.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyProfile(token, {
        bio: bio.trim().length > 0 ? bio.trim() : null,
        displayName: trimmedName,
        ...(newAvatar !== null ? { avatarOverride: newAvatar } : {}),
      });
      setDisplayName(trimmedName);
      setNewAvatar(null);
      setSaved(true);
    } catch {
      setError("No se pudo guardar. Prueba de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  }

  // redes sociales — persiste al toque desde SocialLinksEditor, no
  // queda pendiente del botón "Guardar" de bio/nombre (ver el
  // comentario en ese componente sobre por qué)
  async function handleSaveSocialLinks(updated: SocialLink[]) {
    if (!token) throw new Error("no token");
    await updateMyProfile(token, { socialLinks: updated });
    setSocialLinks(updated);
  }

  // el recorte/zoom ya lo resolvió BannerCropModal — acá solo queda
  // guardar el resultado
  async function handleBannerCropped(dataUrl: string) {
    setCroppingBannerFile(null);
    if (!token) return;
    setBannerError(null);
    setBannerSaved(false);
    setBannerPreview(dataUrl);
    try {
      await updateMyProfile(token, { bannerUrl: dataUrl });
      setBannerSaved(true);
    } catch {
      setBannerError("No se pudo guardar el banner. Prueba de nuevo.");
    }
  }

  // foto de fondo de la CARD (no el banner) — mismos handlers que usa
  // JugadoresPage para cualquier card, acá siempre apuntan a la propia
  async function handleCardBackgroundUpload(_cfnId: string, file: File) {
    if (!token) return;
    try {
      if (isAnimatedGif(file)) {
        if (file.size > MAX_GIF_FILE_SIZE) return; // silencioso, ver comentario abajo
        const raw = await fileToDataUrl(file);
        // el brillo se sigue calculando con canvas — ESO no destruye
        // la animación porque el resultado (un número) no se usa como
        // la imagen final, solo como aproximación de qué tan clara es
        const brightness = await getImageBrightness(raw);
        setBgPreview(raw);
        setBgBrightness(brightness);
        await updateMyCardBackground(token, raw, brightness);
        return;
      }
      const resized = await resizeImageFile(file, CARD_BACKGROUND_SIZE, 0.82);
      const brightness = await getImageBrightness(resized);
      setBgPreview(resized);
      setBgBrightness(brightness);
      await updateMyCardBackground(token, resized, brightness);
    } catch {
      // silencioso a propósito, mismo criterio que JugadoresPage: si
      // falla, la card simplemente no cambia
    }
  }

  async function handleCardBackgroundRemove(cfnId: string) {
    if (!token) return;
    try {
      await removePlayerCardBackground(token, cfnId);
      setBgPreview(null);
      setBgBrightness(null);
    } catch {
      // idem
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

  // player + los cambios todavía no guardados — bio/avatar/foto de
  // fondo se ven al instante en la card de vista previa, sin esperar
  // el botón "Guardar" ni recargar nada
  const previewPlayer: CFNPlayer | null = player && {
    ...player,
    display_name:
      displayName.trim().length > 0 ? displayName.trim() : player.display_name,
    bio: bio.trim().length > 0 ? bio.trim() : null,
    avatar_url: avatarPreview,
    card_background_url: bgPreview,
    card_background_brightness: bgBrightness,
  };

  return (
    <Layout>
      <SectionLabel index="P1">Mi perfil</SectionLabel>

      {loading && (
        <div className="flex flex-col gap-6">
          {/* banner + avatar — mismas medidas que el real (h-32
              sm:h-44, avatar 24, -mt-12) para que no salte el layout
              cuando entra el contenido de verdad */}
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
              <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="h-9 w-28" />
              </div>
              <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-4">
                <Skeleton className="h-3 w-32" />
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-full" />
                  ))}
                </div>
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
          {/* banner de portada — imagen propia, DISTINTA de la foto de
              fondo de la card (referencia: portfolia). El recorte lo
              maneja BannerCropModal (formato Discord), no un cover
              automático. */}
          <div className="hud-frame bg-tdf-charcoal overflow-hidden">
            <div className="relative h-32 sm:h-44 bg-gradient-to-br from-tdf-purple/30 to-tdf-magenta/20">
              {bannerPreview && (
                <CardBackgroundPhoto url={bannerPreview} brightness={null} />
              )}
              <button
                onClick={() => bannerFileInputRef.current?.click()}
                className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 font-body text-[11px] font-medium text-white bg-black/50 hover:bg-black/70 border border-white/20 hover:border-tdf-magenta px-2.5 py-1.5 rounded backdrop-blur-sm transition-colors"
              >
                <ImagePlus size={13} />
                {bannerPreview ? "Cambiar banner" : "Subir banner"}
              </button>
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (isAnimatedGif(file)) {
                    // el editor de recorte usa canvas para dejar
                    // elegir encuadre/zoom — canvas aplanaría la
                    // animación igual que el pipeline automático, así
                    // que un GIF se sube directo, sin pasar por ahí
                    if (file.size > MAX_GIF_FILE_SIZE) {
                      setBannerError(
                        "Ese GIF pesa más de 5MB. Prueba con uno más liviano.",
                      );
                      return;
                    }
                    fileToDataUrl(file).then(handleBannerCropped);
                  } else {
                    setCroppingBannerFile(file);
                  }
                  e.target.value = "";
                }}
              />
            </div>
            {/* items-start (no items-end) + el -mt-12 vive en el propio
                avatar, no en toda la fila — así el nombre no queda
                pegado al borde del banner (bug reportado 29-08-2026) */}
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
                    {displayName.trim().length > 0
                      ? displayName.trim()
                      : player.display_name}
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
                <div className="mt-2.5">
                  <SocialLinksRow links={socialLinks} />
                </div>
              </div>
            </div>
            {(bannerError || bannerSaved) && (
              <p className="px-6 pb-4 font-mono text-[10px]">
                {bannerError && (
                  <span className="text-red-400">{bannerError}</span>
                )}
                {bannerSaved && !bannerError && (
                  <span className="text-emerald-400">Banner guardado.</span>
                )}
              </p>
            )}
          </div>

          {/* dos columnas: edición a la izquierda, preview + radar a
              la derecha (sticky en desktop, para no perderla al
              scrollear el formulario) */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="flex flex-col gap-6">
              <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase text-tdf-muted mb-1.5 block">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value.slice(0, 40));
                      setNameError(null);
                      setSaved(false);
                    }}
                    maxLength={40}
                    className="w-full bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
                  />
                  {nameError && (
                    <p className="text-red-400 text-xs font-body mt-1">
                      {nameError}
                    </p>
                  )}
                  <p className="font-mono text-[10px] text-tdf-muted mt-1">
                    Así te van a ver en tu card, en Jugadores y en todo el
                    sitio.
                  </p>
                </div>

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

              <p className="font-mono text-[10px] text-tdf-muted">
                La foto de fondo de tu card se cambia directo desde los botones
                de arriba a la derecha, en tu vista previa
                {user.is_staff ? " (como staff, también puedes sacarla)" : ""}.
              </p>

              <SocialLinksEditor
                links={socialLinks}
                onSave={handleSaveSocialLinks}
              />

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
                  isOwnCard
                  isStaff={user.is_staff}
                  onUploadBackground={handleCardBackgroundUpload}
                  onRemoveBackground={handleCardBackgroundRemove}
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

      {croppingBannerFile && (
        <BannerCropModal
          file={croppingBannerFile}
          onCancel={() => setCroppingBannerFile(null)}
          onApply={handleBannerCropped}
        />
      )}
    </Layout>
  );
}
