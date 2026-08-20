import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { deleteTierList, listTierLists } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { TierListSummaryData } from "../lib/types";

export default function TierListGalleryPage() {
  const { user, token } = useAuth();
  const [tierLists, setTierLists] = useState<TierListSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<TierListSummaryData | null>(null);

  useEffect(() => {
    listTierLists()
      .then(setTierLists)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // quien la creó (si la guardó logueado) o cualquier staff — las
  // guardadas por invitados (created_by null) solo las borra staff,
  // mismo criterio que el backend (ver deleteTierList en api.ts)
  function canDelete(t: TierListSummaryData): boolean {
    if (!user) return false;
    return user.is_staff || user.id === t.created_by;
  }

  async function handleDelete(t: TierListSummaryData) {
    if (!token) return;
    setDeletingId(t.id);
    try {
      await deleteTierList(token, t.id);
      setTierLists((prev) => prev.filter((x) => x.id !== t.id));
    } catch {
      setError(true);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }

  return (
    <Layout>
      <SectionLabel index="09">Tier list</SectionLabel>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold">Tier lists de la comunidad</h1>
        <Link
          to="/tierlist"
          className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline whitespace-nowrap mt-2"
        >
          Armar la mía →
        </Link>
      </div>
      <p className="text-tdf-muted mb-8 max-w-xl font-body">
        Todo lo que ya rankeó la comunidad, con quién la armó y con qué
        plantilla. Toca cualquiera para verla completa.
      </p>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="hud-frame bg-tdf-charcoal px-5 py-4 flex flex-col gap-3"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-tdf-muted font-body">
          No se pudo cargar la galería. Intenta de nuevo en un rato.
        </p>
      )}

      {!loading && !error && tierLists.length === 0 && (
        <p className="text-tdf-muted font-body">
          Todavía no hay ninguna tier list guardada.{" "}
          <Link
            to="/tierlist"
            className="text-tdf-magenta hover:text-white underline"
          >
            Sé el primero en armar una
          </Link>
          .
        </p>
      )}

      {!loading && !error && tierLists.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tierLists.map((t) => (
            <div
              key={t.id}
              className="hud-frame bg-tdf-charcoal hover:border-tdf-magenta transition-colors relative"
            >
              <Link to={`/tierlist/${t.id}`} className="block px-5 py-4">
                <p
                  className={`font-semibold text-tdf-magenta ${
                    canDelete(t) ? "pr-6" : ""
                  }`}
                >
                  {t.creator_name}
                </p>
                <p className="font-mono text-xs text-tdf-muted mt-1">
                  {t.template_name ?? "Plantilla ya borrada"} · {t.item_count}{" "}
                  ítem{t.item_count === 1 ? "" : "s"}
                </p>
                <p className="font-mono text-[11px] text-tdf-muted mt-2">
                  {new Date(t.created_at).toLocaleDateString("es-CL", {
                    dateStyle: "medium",
                  })}
                </p>
              </Link>
              {canDelete(t) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDelete(t);
                  }}
                  disabled={deletingId === t.id}
                  className="absolute top-2 right-2 text-tdf-muted hover:text-red-400 disabled:opacity-30 text-xs px-1.5 py-1"
                  aria-label={`Borrar tier list de ${t.creator_name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* mismo patrón de popup propio que el resto del sitio (no
          window.confirm) */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="hud-frame bg-tdf-charcoal border border-tdf-line w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-xs uppercase text-red-400">
                Borrar tier list
              </h3>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-tdf-muted hover:text-white text-sm"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-200 mb-5">
              ¿Borrar la tier list de{" "}
              <span className="font-semibold text-white">
                {confirmDelete.creator_name}
              </span>
              ? El link que se haya compartido deja de funcionar.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="border border-tdf-line hover:border-white transition-colors px-4 py-2 font-mono text-[11px] uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors px-4 py-2 font-mono text-[11px] uppercase text-red-300 disabled:opacity-50"
              >
                {deletingId === confirmDelete.id ? "Borrando..." : "Borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
