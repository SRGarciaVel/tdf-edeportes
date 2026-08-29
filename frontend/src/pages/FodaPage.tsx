import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import FodaEntryCard from "../components/FodaEntryCard";
import FodaForm from "../components/FodaForm";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { createFoda, deleteFoda, listFoda } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { FodaEntry } from "../lib/types";

/** FODA de la comunidad — actividad pedida por el CEO (vía Seba,
 * 29-08-2026) centrada en Pochoclo23, Younghou y Kane Blueriver, pero
 * deliberadamente abierta a cualquier nombre (ver FodaForm) — "no
 * molestaría" dejarlo así, palabras del CEO. Libre para cualquiera,
 * con o sin cuenta, mismo criterio que ranquear una tier list ya
 * existente. */
export default function FodaPage() {
  const { user, token } = useAuth();
  const [entries, setEntries] = useState<FodaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // se llena solo cuando se acaba de mandar una PRIVADA — es el aviso
  // destacado de "descargala ahora" (ver comentario más abajo)
  const [justCreatedPrivate, setJustCreatedPrivate] =
    useState<FodaEntry | null>(null);

  useEffect(() => {
    listFoda(token ?? undefined)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(entry: {
    subjectName: string;
    authorName?: string;
    isPublic: boolean;
    fortalezas: string;
    oportunidades: string;
    debilidades: string;
    amenazas: string;
  }) {
    const created = await createFoda(entry, token ?? undefined);
    setEntries((prev) => [created, ...prev]);
    if (!created.is_public) setJustCreatedPrivate(created);
  }

  async function handleDelete(id: string) {
    if (!token) return;
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id));
    try {
      await deleteFoda(token, id);
    } catch {
      setEntries(prev);
    }
  }

  return (
    <Layout>
      <SectionLabel index="01">FODA</SectionLabel>
      <p className="text-tdf-muted font-body text-sm mb-6 max-w-2xl">
        Fortalezas, Oportunidades, Debilidades y Amenazas. El análisis de la
        comunidad sobre los jugadores de la escena. Cualquiera puede aportar el
        suyo.
      </p>

      <div className="mb-8">
        <FodaForm onSubmit={handleCreate} />
      </div>

      {justCreatedPrivate && (
        <div className="hud-frame bg-tdf-purple/10 border border-tdf-magenta p-5 mb-8 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-tdf-magenta">
              <Download size={16} />
              <p className="font-mono text-xs uppercase">
                Este quedó privado
                {!user && ". Descárgalo antes de salir de esta página"}
              </p>
            </div>
            <button
              onClick={() => setJustCreatedPrivate(null)}
              aria-label="Cerrar aviso"
              className="text-tdf-muted hover:text-white shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <FodaEntryCard entry={justCreatedPrivate} />
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <p className="font-mono text-xs text-tdf-muted">
          Todavía no hay ningún FODA publicado. Sé el primero.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <div className="flex flex-col gap-6">
          {entries.map((entry) => (
            <FodaEntryCard
              key={entry.id}
              entry={entry}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
