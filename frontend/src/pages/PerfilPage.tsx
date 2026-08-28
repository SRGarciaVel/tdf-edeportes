import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  getMyCfnRegistration,
  listCfnPlayers,
  updateMyCardBackground,
  updateMyProfile,
} from "../lib/api";
import { getImageBrightness, resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type { CFNPlayer, CFNRegistration } from "../lib/types";

const BIO_MAX_LENGTH = 280;
const AVATAR_SIZE = 160;
// mismo tamaño que usa /jugadores para la foto de fondo — si cambia
// ahí, cambiar acá también (ver JugadoresPage.tsx)
const CARD_BACKGROUND_SIZE = 480;

/** Auto-edición de perfil (bio + avatar) — antes vivía como botón
 * directo en la propia card de /jugadores, movida acá a pedido de Seba
 * (28-08-2026): quería un lugar propio, accesible desde "Mi perfil" en
 * el menú desplegable del nombre de usuario en la navbar (ver
 * LoginButton.tsx), no mezclado con la vista pública de jugadores. La
 * edición en sí sigue pegando al mismo endpoint de siempre (PATCH
 * /cfn/register/me/profile) — solo cambió DÓNDE vive el formulario. */
export default function PerfilPage() {
  const { user, token } = useAuth();
  const [registration, setRegistration] = useState<CFNRegistration | null>(
    null,
  );
  const [player, setPlayer] = useState<CFNPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bgPreview, setBgPreview] = useState<string | null>(null);
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
  // mismo paso, no queda pendiente de "Guardar" como bio/avatar
  async function handleBackgroundFile(file: File) {
    if (!token) return;
    setBgSaving(true);
    setBgError(null);
    setBgSaved(false);
    try {
      const resized = await resizeImageFile(file, CARD_BACKGROUND_SIZE, 0.82);
      const brightness = await getImageBrightness(resized);
      await updateMyCardBackground(token, resized, brightness);
      setBgPreview(resized);
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
          Necesitás iniciar sesión con Twitch para ver y editar tu perfil.
        </p>
      </Layout>
    );
  }

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
            Vas a poder editar tu bio y avatar una vez que se apruebe.
          </p>
        </div>
      )}

      {!loading && registration?.status === "rejected" && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md">
          <p className="text-tdf-muted font-body text-sm mb-3">
            Tu solicitud anterior no fue aprobada. Podés intentar de nuevo desde{" "}
            <Link to="/jugadores" className="text-tdf-magenta hover:underline">
              Jugadores
            </Link>
            .
          </p>
        </div>
      )}

      {!loading && registration?.status === "approved" && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-tdf-line shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <InitialsAvatar
                  seed={player?.display_name ?? user.display_name}
                  size={16}
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-body text-xs font-medium text-tdf-muted hover:text-white bg-tdf-dark border border-tdf-line hover:border-tdf-magenta px-3 py-1.5 rounded self-start"
              >
                Cambiar foto
              </button>
              <p className="font-mono text-[10px] text-tdf-muted">
                Se recorta a un cuadrado automáticamente.
              </p>
            </div>
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
              placeholder="Contá algo de vos: main, estilo de juego, lo que quieras..."
              rows={3}
              className="w-full bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body resize-none"
            />
            <p className="font-mono text-[10px] text-tdf-muted mt-1 text-right">
              {bio.length}/{BIO_MAX_LENGTH}
            </p>
          </div>

          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
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
              Ver tu card pública →
            </Link>
          </div>

          {user.is_staff && (
            <p className="font-mono text-[10px] text-tdf-muted border-t border-tdf-line pt-3">
              Como staff, la foto de fondo de cualquier card (incluida la tuya)
              se administra desde /jugadores.
            </p>
          )}
        </div>
      )}

      {!loading && registration?.status === "approved" && !user.is_staff && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 max-w-md flex flex-col gap-4 mt-4">
          <div>
            <h2 className="font-mono text-xs uppercase text-tdf-muted mb-1">
              Foto de fondo de tu card
            </h2>
            <p className="font-mono text-[10px] text-tdf-muted">
              Es la imagen grande de fondo que se ve en tu card pública en{" "}
              <Link
                to="/jugadores"
                className="text-tdf-magenta hover:underline"
              >
                Jugadores
              </Link>
              .
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-24 h-16 rounded overflow-hidden bg-tdf-dark border border-tdf-line shrink-0">
              {bgPreview && (
                <img
                  src={bgPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <button
              onClick={() => bgFileInputRef.current?.click()}
              disabled={bgSaving}
              className="font-body text-xs font-medium text-tdf-muted hover:text-white bg-tdf-dark border border-tdf-line hover:border-tdf-magenta px-3 py-1.5 rounded disabled:opacity-50"
            >
              {bgSaving
                ? "Subiendo..."
                : bgPreview
                  ? "Reemplazar foto"
                  : "Subir foto"}
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

          {bgError && (
            <p className="text-red-400 text-xs font-body">{bgError}</p>
          )}
          {bgSaved && !bgError && (
            <p className="text-emerald-400 text-xs font-body">
              Foto de fondo guardada.
            </p>
          )}
          <p className="font-mono text-[10px] text-tdf-muted">
            Si necesitás sacarla (no reemplazarla), pedíselo a staff — es lo
            único que queda del lado de moderación.
          </p>
        </div>
      )}
    </Layout>
  );
}
