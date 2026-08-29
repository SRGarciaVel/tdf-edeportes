import { Trash2 } from "lucide-react";
import { FODA_QUADRANTS } from "../lib/fodaQuadrants";
import type { FodaEntry } from "../lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Una entrada de FODA completa — el cuadrado clásico 2x2, cada
 * cuadrante con su color semántico (ver fodaQuadrants.ts). Se apila a
 * una columna en mobile. */
export default function FodaEntryCard({
  entry,
  onDelete,
}: {
  entry: FodaEntry;
  onDelete?: () => void;
}) {
  return (
    <div className="hud-frame bg-tdf-charcoal p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-lg">
            {entry.subject_name}
          </h3>
          <p className="font-mono text-[10px] text-tdf-muted">
            por {entry.author_name} · {formatDate(entry.created_at)}
          </p>
        </div>
        {entry.can_delete && onDelete && (
          <button
            onClick={onDelete}
            aria-label="Borrar esta entrada"
            className="text-tdf-muted hover:text-red-400 shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {FODA_QUADRANTS.map((q) => {
          const Icon = q.Icon;
          return (
            <div
              key={q.key}
              className={`border ${q.border} ${q.bg} rounded px-3 py-2.5 flex flex-col gap-1.5`}
            >
              <div
                className={`flex items-center gap-1.5 font-mono text-[10px] uppercase ${q.iconColor}`}
              >
                <Icon size={13} /> {q.label}
              </div>
              <p className="font-body text-sm text-tdf-muted whitespace-pre-wrap break-words">
                {entry[q.key]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
