import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  SOCIAL_PLATFORM_ORDER,
  SOCIAL_PLATFORMS,
} from "../lib/socialPlatforms";
import type { SocialLink } from "../lib/types";

const MAX_LINKS = 5;

/** Gestión de redes sociales — cada agregar/editar/borrar persiste al
 * toque (llama a onSave con la lista completa actualizada), no queda
 * pendiente del botón "Guardar" de bio/nombre: mismo criterio que
 * Twitch en su propio panel de referencia (cada acción ahí es
 * inmediata, no hay un "guardar todo" aparte). */
export default function SocialLinksEditor({
  links,
  onSave,
}: {
  links: SocialLink[];
  onSave: (links: SocialLink[]) => Promise<void>;
}) {
  const [platform, setPlatform] = useState<SocialLink["platform"]>("instagram");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = SOCIAL_PLATFORMS[platform];
  const atLimit = links.length >= MAX_LINKS && editingIndex === null;

  function resetForm() {
    setPlatform("instagram");
    setLabel("");
    setUrl("");
    setEditingIndex(null);
  }

  function startEdit(index: number) {
    const link = links[index];
    setPlatform(link.platform);
    setLabel(link.platform === "other" ? link.label : "");
    setUrl(link.url);
    setEditingIndex(index);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Falta el link.");
      return;
    }
    if (!/^https?:\/\//.test(trimmedUrl)) {
      setError("El link tiene que empezar con http:// o https://");
      return;
    }
    const finalLabel = platform === "other" ? label.trim() : config.label;
    if (platform === "other" && !finalLabel) {
      setError("Ponle un nombre a este link.");
      return;
    }

    const newLink: SocialLink = {
      platform,
      label: finalLabel,
      url: trimmedUrl,
    };
    const updated =
      editingIndex !== null
        ? links.map((l, i) => (i === editingIndex ? newLink : l))
        : [...links, newLink];

    setSaving(true);
    try {
      await onSave(updated);
      resetForm();
    } catch {
      setError("No se pudo guardar. Prueba de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(index: number) {
    setSaving(true);
    setError(null);
    try {
      await onSave(links.filter((_, i) => i !== index));
      if (editingIndex === index) resetForm();
    } catch {
      setError("No se pudo borrar. Prueba de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-4">
      <div>
        <h2 className="font-mono text-xs uppercase text-tdf-muted mb-1">
          Redes sociales
        </h2>
        <p className="font-mono text-[10px] text-tdf-muted">
          Hasta {MAX_LINKS} links. Se muestran como íconos junto a tu nombre.
        </p>
      </div>

      <div className="grid sm:grid-cols-[140px_1fr] gap-3">
        <select
          value={platform}
          onChange={(e) =>
            setPlatform(e.target.value as SocialLink["platform"])
          }
          disabled={atLimit && editingIndex === null}
          className="bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
        >
          {SOCIAL_PLATFORM_ORDER.map((p) => (
            <option key={p} value={p}>
              {SOCIAL_PLATFORMS[p].label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={config.placeholder}
          disabled={atLimit && editingIndex === null}
          className="bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
        />
      </div>

      {platform === "other" && (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 30))}
          placeholder="Nombre a mostrar (ej. Portfolio)"
          disabled={atLimit && editingIndex === null}
          className="bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
        />
      )}

      {error && <p className="text-red-400 text-xs font-body">{error}</p>}
      {atLimit && (
        <p className="font-mono text-[10px] text-tdf-muted">
          Llegaste al máximo de {MAX_LINKS}. Borra uno para agregar otro.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving || (atLimit && editingIndex === null)}
          className="font-body text-xs font-medium px-3 py-1.5 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
        >
          {editingIndex !== null ? "Guardar cambios" : "Añadir"}
        </button>
        {editingIndex !== null && (
          <button
            onClick={resetForm}
            className="font-mono text-xs text-tdf-muted hover:text-white"
          >
            Cancelar edición
          </button>
        )}
      </div>

      {links.length > 0 && (
        <div className="border-t border-tdf-line pt-3 flex flex-col gap-2">
          {links.map((link, i) => {
            const Icon = SOCIAL_PLATFORMS[link.platform].Icon;
            const displayLabel =
              link.platform === "other"
                ? link.label
                : SOCIAL_PLATFORMS[link.platform].label;
            return (
              <div
                key={i}
                className="flex items-center gap-3 bg-tdf-dark px-3 py-2"
              >
                <Icon size={16} className="text-tdf-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body">{displayLabel}</p>
                  <p className="font-mono text-[10px] text-tdf-muted truncate">
                    {link.url}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(i)}
                  aria-label="Editar"
                  className="text-tdf-muted hover:text-white shrink-0"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(i)}
                  aria-label="Borrar"
                  className="text-tdf-muted hover:text-red-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
