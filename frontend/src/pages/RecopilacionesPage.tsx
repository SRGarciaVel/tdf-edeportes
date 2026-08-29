import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import InstagramEmbed from "../components/InstagramEmbed";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { createHighlight, deleteHighlight, listHighlights } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { InstagramHighlight } from "../lib/types";

/** Archivo completo de recopilaciones de Instagram (el vistazo chico
 * vive en Home) — curadas a mano por staff, no un feed automático (ver
 * conversación con Seba, 29-08-2026: las suben "cada tanto", no vale
 * la pena mantener un token de la API de Instagram que se vence cada
 * ~60 días para esto). */
export default function RecopilacionesPage() {
  const { user, token } = useAuth();
  const [highlights, setHighlights] = useState<InstagramHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listHighlights()
      .then(setHighlights)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!token) return;
    const url = newUrl.trim();
    if (!url) return;
    setAdding(true);
    setError(null);
    try {
      const created = await createHighlight(token, url);
      setHighlights((prev) => [created, ...prev]);
      setNewUrl("");
    } catch {
      setError(
        "No se pudo agregar. Confirma que sea un link a un post/reel de instagram.com.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    const prev = highlights;
    setHighlights((h) => h.filter((x) => x.id !== id));
    try {
      await deleteHighlight(token, id);
    } catch {
      setHighlights(prev);
    }
  }

  return (
    <Layout>
      <SectionLabel index="01">Recopilaciones</SectionLabel>
      <p className="text-tdf-muted font-body text-sm mb-6 max-w-2xl">
        Lo mejor de nuestros streams, tal como lo suben en{" "}
        <a
          href="https://www.instagram.com/tdf_edeportes/"
          target="_blank"
          rel="noreferrer"
          className="text-tdf-magenta hover:underline"
        >
          @tdf_edeportes
        </a>
        .
      </p>

      {user?.is_staff && (
        <div className="hud-frame bg-tdf-charcoal px-6 py-5 mb-8 flex flex-col gap-3 max-w-xl">
          <p className="font-mono text-[10px] uppercase text-tdf-muted">
            Agregar recopilación (solo staff)
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="flex-1 bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
            />
            <button
              onClick={handleAdd}
              disabled={adding || newUrl.trim().length === 0}
              className="font-body text-sm px-4 py-2 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50 shrink-0"
            >
              {adding ? "Agregando..." : "Agregar"}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      )}

      {!loading && highlights.length === 0 && (
        <p className="font-mono text-xs text-tdf-muted">
          Todavía no hay recopilaciones cargadas.
        </p>
      )}

      {!loading && highlights.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-6">
          {highlights.map((h) => (
            <div key={h.id} className="flex flex-col gap-2">
              <InstagramEmbed url={h.url} />
              {user?.is_staff && (
                <button
                  onClick={() => handleDelete(h.id)}
                  className="self-center flex items-center gap-1.5 font-mono text-[10px] text-tdf-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} /> Sacar de la lista
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
