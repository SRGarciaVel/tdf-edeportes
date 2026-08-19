import { toBlob, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { deleteTierList, getTierList } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { useAuth } from "../lib/auth";
import type { TierItemData, TierListData, TierMetaData } from "../lib/types";

// solo se usa como fallback para tier lists guardadas ANTES de tier_meta
// (ver más abajo) — mismos valores más claros que TIER_PALETTE en
// TierListPage.tsx (feedback del CEO y Pochoclo23: los colores viejos
// (/20, /40) se veían muy oscuros)
const FALLBACK_TIER_COLORS = [
  "bg-red-500/40 border-red-500/70",
  "bg-orange-500/40 border-orange-500/70",
  "bg-yellow-500/40 border-yellow-500/70",
  "bg-lime-500/40 border-lime-500/70",
  "bg-emerald-500/40 border-emerald-500/70",
  "bg-teal-500/40 border-teal-500/70",
  "bg-sky-500/40 border-sky-500/70",
  "bg-purple-500/40 border-purple-500/70",
  "bg-fuchsia-500/40 border-fuchsia-500/70",
  "bg-pink-500/40 border-pink-500/70",
  "bg-gray-500/40 border-gray-500/70",
  "bg-stone-500/40 border-stone-500/70",
];

function ItemChip({ item }: { item: TierItemData }) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.label}
        className="w-16 h-16 object-cover border border-tdf-line"
      />
    );
  }
  return (
    <span
      className={`px-2 py-1 text-xs font-mono border border-current/40 bg-tdf-dark ${characterColorClass(
        item.label,
      )}`}
    >
      {item.label}
    </span>
  );
}

export default function TierListSharedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [data, setData] = useState<TierListData | null>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getTierList(id)
      .then(setData)
      .catch(() => setError(true));
  }, [id]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // quien la creó (si la guardó logueado) o cualquier staff — mismo
  // criterio que el backend, ver deleteTierList en api.ts
  const canDelete =
    !!user && !!data && (user.is_staff || user.id === data.created_by);

  async function handleDelete() {
    if (!token || !id) return;
    setDeleting(true);
    try {
      await deleteTierList(token, id);
      navigate("/tierlist/comunidad");
    } catch {
      setMessage("No se pudo borrar la tier list.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownload() {
    if (!boardRef.current) return;
    const dataUrl = await toPng(boardRef.current, {
      backgroundColor: "#0D0710",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = "tdf-tierlist.png";
    link.href = dataUrl;
    link.click();
  }

  async function handleCopyImage() {
    if (!boardRef.current) return;
    try {
      const blob = await toBlob(boardRef.current, {
        backgroundColor: "#0D0710",
        pixelRatio: 2,
      });
      if (!blob) throw new Error("sin blob");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setMessage("Imagen copiada al portapapeles.");
    } catch {
      setMessage(
        "No se pudo copiar la imagen en este navegador, descárgala en su lugar.",
      );
    }
  }

  if (error) {
    return (
      <Layout>
        <p className="text-gray-500">No se encontró esta tier list.</p>
        <Link
          to="/tierlist"
          className="text-tdf-purple hover:text-tdf-magenta underline"
        >
          Arma la tuya →
        </Link>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <p className="text-gray-500">Cargando...</p>
      </Layout>
    );
  }

  // tier_meta es la fuente de verdad del orden, color y nombre mostrado
  // (ver TierMeta en el backend) — se agregó para arreglar el bug de que
  // el tier S terminaba mostrándose al final (Postgres JSONB no
  // garantiza el orden de las keys de un objeto, tiers es un objeto).
  // Fallback para tier lists guardadas ANTES de este cambio (tier_meta
  // vacío): reconstruir con el orden que devuelva Postgres, más un color
  // por índice — es el mismo comportamiento (imperfecto) de siempre para
  // esos casos viejos, mejor que romper la página.
  const tierMeta: TierMetaData[] =
    data.tier_meta.length > 0
      ? data.tier_meta
      : Object.keys(data.tiers).map((label, i) => ({
          id: label,
          label,
          color: FALLBACK_TIER_COLORS[i % FALLBACK_TIER_COLORS.length],
        }));

  return (
    <Layout>
      <SectionLabel index="09">Tier list</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Tier list de la comunidad</h1>
      <p className="text-gray-500 mb-8">
        Armada por <span className="text-tdf-purple">{data.creator_name}</span>
        {data.template_name && (
          <>
            {" "}
            con la plantilla{" "}
            <span className="text-white">"{data.template_name}"</span>
          </>
        )}
        .
      </p>

      <div ref={boardRef} className="bg-tdf-dark p-4">
        <div className="flex flex-col gap-1">
          {tierMeta.map((meta) => (
            <div key={meta.id} className="flex">
              <div
                className={`w-16 min-w-0 shrink-0 flex items-center justify-center font-bold text-lg text-center break-words leading-tight border px-1 py-2 ${meta.color}`}
              >
                {meta.label}
              </div>
              <div className="flex-1 min-h-16 border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-2 items-start content-start">
                {(data.tiers[meta.id] ?? []).map((item) => (
                  <ItemChip key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <p className="font-mono text-xs text-tdf-magenta mt-4">{message}</p>
      )}

      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={handleDownload}
          className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase"
        >
          Descargar PNG
        </button>
        <button
          onClick={handleCopyImage}
          className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase"
        >
          Copiar imagen
        </button>
        <Link
          to="/tierlist/comunidad"
          className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase"
        >
          Ver más de la comunidad
        </Link>
        <Link
          to="/tierlist"
          className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white"
        >
          Armar la mía →
        </Link>
        {canDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors px-4 py-2 font-mono text-xs uppercase ml-auto"
          >
            Borrar
          </button>
        )}
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setConfirmDelete(false)}
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
                onClick={() => setConfirmDelete(false)}
                className="text-gray-500 hover:text-white text-sm"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-200 mb-5">
              ¿Borrar esta tier list? El link que se haya compartido deja de
              funcionar.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="border border-tdf-line hover:border-white transition-colors px-4 py-2 font-mono text-[11px] uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors px-4 py-2 font-mono text-[11px] uppercase text-red-300 disabled:opacity-50"
              >
                {deleting ? "Borrando..." : "Borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
