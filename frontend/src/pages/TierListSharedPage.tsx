import { toBlob, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { getTierList } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type { TierListData } from "../lib/types";

const TIER_ORDER = ["S", "A", "B", "C", "D"];
const TIER_COLORS: Record<string, string> = {
  S: "bg-red-500/20 border-red-500/40",
  A: "bg-orange-500/20 border-orange-500/40",
  B: "bg-yellow-500/20 border-yellow-500/40",
  C: "bg-lime-500/20 border-lime-500/40",
  D: "bg-emerald-500/20 border-emerald-500/40",
};

export default function TierListSharedPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TierListData | null>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  async function handleDownload() {
    if (!boardRef.current || !data) return;
    const dataUrl = await toPng(boardRef.current, { backgroundColor: "#0D0710", pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `tdf-tierlist-${data.game}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function handleCopyImage() {
    if (!boardRef.current) return;
    try {
      const blob = await toBlob(boardRef.current, { backgroundColor: "#0D0710", pixelRatio: 2 });
      if (!blob) throw new Error("sin blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMessage("Imagen copiada al portapapeles.");
    } catch {
      setMessage("No se pudo copiar la imagen en este navegador — probá descargarla.");
    }
  }

  if (error) {
    return (
      <Layout>
        <p className="text-gray-500">No se encontró esta tier list.</p>
        <Link to="/tierlist" className="text-tdf-purple hover:text-tdf-magenta underline">
          Armá la tuya →
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

  return (
    <Layout>
      <SectionLabel index="09">Tier list</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">
        Tier list de {data.game === "sf6" ? "Street Fighter 6" : "Third Strike"}
      </h1>
      <p className="text-gray-500 mb-8">Armada por alguien de la comunidad.</p>

      <div ref={boardRef} className="bg-tdf-dark p-4">
        <div className="flex flex-col gap-1">
          {TIER_ORDER.map((tier) => (
            <div key={tier} className="flex">
              <div
                className={`w-16 shrink-0 flex items-center justify-center font-bold text-xl border ${TIER_COLORS[tier]}`}
              >
                {tier}
              </div>
              <div className="flex-1 min-h-16 border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-2 items-start content-start">
                {(data.tiers[tier] ?? []).map((name) => (
                  <span
                    key={name}
                    className={`px-2 py-1 text-xs font-mono border border-current/40 bg-tdf-dark ${characterColorClass(
                      name
                    )}`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && <p className="font-mono text-xs text-tdf-magenta mt-4">{message}</p>}

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
          to="/tierlist"
          className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white"
        >
          Armar la mía →
        </Link>
      </div>
    </Layout>
  );
}
