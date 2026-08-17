import { toBlob, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { getTierList } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type { TierItemData, TierListData } from "../lib/types";

const TIER_COLORS = [
  "bg-red-500/20 border-red-500/40",
  "bg-orange-500/20 border-orange-500/40",
  "bg-yellow-500/20 border-yellow-500/40",
  "bg-lime-500/20 border-lime-500/40",
  "bg-emerald-500/20 border-emerald-500/40",
  "bg-teal-500/20 border-teal-500/40",
  "bg-sky-500/20 border-sky-500/40",
  "bg-purple-500/20 border-purple-500/40",
  "bg-fuchsia-500/20 border-fuchsia-500/40",
  "bg-pink-500/20 border-pink-500/40",
  "bg-gray-500/20 border-gray-500/40",
  "bg-stone-500/20 border-stone-500/40",
];

function ItemChip({ item }: { item: TierItemData }) {
  if (item.image) {
    return <img src={item.image} alt={item.label} className="w-16 h-16 object-cover border border-tdf-line" />;
  }
  return (
    <span
      className={`px-2 py-1 text-xs font-mono border border-current/40 bg-tdf-dark ${characterColorClass(
        item.label
      )}`}
    >
      {item.label}
    </span>
  );
}

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
    if (!boardRef.current) return;
    const dataUrl = await toPng(boardRef.current, { backgroundColor: "#0D0710", pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = "tdf-tierlist.png";
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
      setMessage("No se pudo copiar la imagen en este navegador — descárgala en su lugar.");
    }
  }

  if (error) {
    return (
      <Layout>
        <p className="text-gray-500">No se encontró esta tier list.</p>
        <Link to="/tierlist" className="text-tdf-purple hover:text-tdf-magenta underline">
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

  const tierIds = Object.keys(data.tiers);

  return (
    <Layout>
      <SectionLabel index="09">Tier list</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Tier list de la comunidad</h1>
      <p className="text-gray-500 mb-8">Armada por alguien de TDF.</p>

      <div ref={boardRef} className="bg-tdf-dark p-4">
        <div className="flex flex-col gap-1">
          {tierIds.map((tierId, i) => (
            <div key={tierId} className="flex">
              <div
                className={`w-16 shrink-0 flex items-center justify-center font-bold text-lg border ${
                  TIER_COLORS[i % TIER_COLORS.length]
                }`}
              >
                {tierId}
              </div>
              <div className="flex-1 min-h-16 border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-2 items-start content-start">
                {data.tiers[tierId].map((item) => (
                  <ItemChip key={item.id} item={item} />
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
