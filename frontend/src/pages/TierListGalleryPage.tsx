import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { listTierLists } from "../lib/api";
import type { TierListSummaryData } from "../lib/types";

export default function TierListGalleryPage() {
  const [tierLists, setTierLists] = useState<TierListSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    listTierLists()
      .then(setTierLists)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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
      <p className="text-gray-500 mb-8 max-w-xl">
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
        <p className="text-gray-500">
          No se pudo cargar la galería. Intenta de nuevo en un rato.
        </p>
      )}

      {!loading && !error && tierLists.length === 0 && (
        <p className="text-gray-500">
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
            <Link
              key={t.id}
              to={`/tierlist/${t.id}`}
              className="hud-frame bg-tdf-charcoal hover:border-tdf-magenta transition-colors px-5 py-4"
            >
              <p className="font-semibold text-tdf-magenta">{t.creator_name}</p>
              <p className="font-mono text-xs text-gray-500 mt-1">
                {t.template_name ?? "Plantilla ya borrada"} · {t.item_count}{" "}
                ítem{t.item_count === 1 ? "" : "s"}
              </p>
              <p className="font-mono text-[11px] text-gray-600 mt-2">
                {new Date(t.created_at).toLocaleDateString("es-CL", {
                  dateStyle: "medium",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
