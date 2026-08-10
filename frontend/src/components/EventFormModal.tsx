import { useState } from "react";
import type { EventFormValues, EventItem, EventType, EventVisibility } from "../lib/types";

interface Props {
  initialDate: string | null; // YYYY-MM-DD, para prellenar al crear
  editingEvent: EventItem | null; // si viene, es edición
  onSubmit: (values: EventFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

/** Convierte un ISO string a formato aceptado por <input type="datetime-local"> */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export default function EventFormModal({
  initialDate,
  editingEvent,
  onSubmit,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(editingEvent?.title ?? "");
  const [type, setType] = useState<EventType>(editingEvent?.type ?? "torneo");
  const [startAt, setStartAt] = useState(
    editingEvent
      ? toLocalInputValue(editingEvent.start_at)
      : initialDate
        ? `${initialDate}T18:00`
        : ""
  );
  const [endAt, setEndAt] = useState(toLocalInputValue(editingEvent?.end_at ?? null));
  const [description, setDescription] = useState(editingEvent?.description ?? "");
  const [externalUrl, setExternalUrl] = useState(editingEvent?.external_url ?? "");
  const [visibility, setVisibility] = useState<EventVisibility>(
    editingEvent?.visibility ?? "staff"
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        title,
        type,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        description: description || null,
        external_url: externalUrl || null,
        visibility,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="hud-frame spray-bg bg-tdf-charcoal w-full max-w-md p-6 flex flex-col gap-4"
      >
        <h3 className="relative z-10 text-xl font-graffiti normal-case text-tdf-magenta">
          {editingEvent ? "Editar evento" : "Nuevo evento"}
        </h3>

        <label className="relative z-10 flex flex-col gap-1 text-sm text-gray-300">
          Título
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white transition-colors"
          />
        </label>

        <div className="relative z-10 flex gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-300 flex-1">
            Tipo
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white transition-colors"
            >
              <option value="torneo">Torneo</option>
              <option value="stream">Stream</option>
              <option value="reunion">Reunión</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-300 flex-1">
            Visibilidad
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as EventVisibility)}
              className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white transition-colors"
            >
              <option value="staff">Solo staff</option>
              <option value="publico">Público</option>
            </select>
          </label>
        </div>

        <div className="relative z-10 flex gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-300 flex-1">
            Inicio
            <input
              required
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              min={editingEvent ? undefined : toLocalInputValue(new Date().toISOString())}
              className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300 flex-1">
            Fin (opcional)
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white transition-colors"
            />
          </label>
        </div>

        <label className="relative z-10 flex flex-col gap-1 text-sm text-gray-300">
          Link externo (start.gg, etc.)
          <input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white transition-colors"
          />
        </label>

        <label className="relative z-10 flex flex-col gap-1 text-sm text-gray-300">
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-black/40 border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-white resize-none transition-colors"
          />
        </label>

        {error && <p className="relative z-10 text-sm text-red-400">{error}</p>}

        <div className="relative z-10 flex justify-between items-center pt-2">
          <div>
            {editingEvent && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Borrar evento
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-tdf-purple hover:bg-tdf-magenta transition-colors text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
