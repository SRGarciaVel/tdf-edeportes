import { useRef, useState } from "react";
import { updateMyProfile } from "../lib/api";
import { resizeImageFile } from "../lib/imageResize";
import type { CFNPlayer } from "../lib/types";

const BIO_MAX_LENGTH = 280;
const AVATAR_SIZE = 160;

/** Panel de auto-edición de perfil — bio y avatar en un solo lugar,
 * porque el backend también los agrupa en un solo endpoint (PATCH
 * /cfn/register/me/profile). Solo aparece en la propia card
 * (isOwnCard), nunca en la de otro jugador. */
export default function EditProfileModal({
  player,
  token,
  onClose,
  onSaved,
}: {
  player: CFNPlayer;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bio, setBio] = useState(player.bio ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    player.avatar_url,
  );
  // null = sin cambio (se manda el avatar_override actual tal cual);
  // string = nueva imagen ya redimensionada, lista para mandar
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarFile(file: File) {
    try {
      const resized = await resizeImageFile(file, AVATAR_SIZE, 0.85);
      setNewAvatar(resized);
      setAvatarPreview(resized);
    } catch {
      setError("No se pudo procesar esa imagen. Probá con otra.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // solo se manda avatarOverride si de verdad cambió — así no se
      // pisa con el mismo valor por las dudas, mismo criterio de
      // exclude_unset que ya usa el backend
      await updateMyProfile(token, {
        bio: bio.trim().length > 0 ? bio.trim() : null,
        ...(newAvatar !== null ? { avatarOverride: newAvatar } : {}),
      });
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar. Probá de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="hud-frame bg-tdf-charcoal w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-tdf-line flex items-center justify-between shrink-0">
          <h2 className="font-semibold">Editar perfil</h2>
          <button
            onClick={onClose}
            className="text-tdf-muted hover:text-white font-mono text-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-tdf-dark border border-tdf-line shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-bold text-tdf-muted">
                  {player.display_name.slice(0, 2).toUpperCase()}
                </div>
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
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
              placeholder="Contá algo de vos: main, estilo de juego, lo que quieras..."
              rows={3}
              className="w-full bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body resize-none"
            />
            <p className="font-mono text-[10px] text-tdf-muted mt-1 text-right">
              {bio.length}/{BIO_MAX_LENGTH}
            </p>
          </div>

          {error && <p className="text-red-400 text-xs font-body">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="font-body text-sm px-4 py-2 text-tdf-muted hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="font-body text-sm px-4 py-2 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
