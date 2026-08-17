import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { toBlob, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { createTierList } from "../lib/api";
import { SF6_ROSTER, THIRD_STRIKE_ROSTER, characterColorClass } from "../lib/characterColors";
import type { TierListGame } from "../lib/types";

const TIER_ORDER = ["S", "A", "B", "C", "D"];
const TIER_COLORS: Record<string, string> = {
  S: "bg-red-500/20 border-red-500/40",
  A: "bg-orange-500/20 border-orange-500/40",
  B: "bg-yellow-500/20 border-yellow-500/40",
  C: "bg-lime-500/20 border-lime-500/40",
  D: "bg-emerald-500/20 border-emerald-500/40",
};

function emptyTiers(): Record<string, string[]> {
  return Object.fromEntries(TIER_ORDER.map((t) => [t, []]));
}

function rosterFor(game: TierListGame): string[] {
  return game === "sf6" ? [...SF6_ROSTER] : [...THIRD_STRIKE_ROSTER];
}

function DraggableChip({ name }: { name: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: name });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`px-2 py-1 text-xs font-mono border border-current/40 bg-tdf-dark cursor-grab active:cursor-grabbing select-none touch-none ${characterColorClass(
        name
      )} ${isDragging ? "opacity-30 relative z-50" : ""}`}
    >
      {name}
    </div>
  );
}

function DroppableZone({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "outline outline-2 outline-tdf-magenta" : ""}`}>
      {children}
    </div>
  );
}

export default function TierListPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState<TierListGame>("sf6");
  const [tiers, setTiers] = useState<Record<string, string[]>>(emptyTiers());
  const [unplaced, setUnplaced] = useState<string[]>(rosterFor("sf6"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTiers(emptyTiers());
    setUnplaced(rosterFor(game));
  }, [game]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const character = String(active.id);
    const targetZone = String(over.id);

    setTiers((prev) => {
      const next: Record<string, string[]> = {};
      for (const [tier, list] of Object.entries(prev)) {
        next[tier] = list.filter((c) => c !== character);
      }
      if (TIER_ORDER.includes(targetZone)) {
        next[targetZone] = [...next[targetZone], character];
      }
      return next;
    });

    setUnplaced((prev) => {
      const withoutChar = prev.filter((c) => c !== character);
      return targetZone === "unplaced" ? [...withoutChar, character] : withoutChar;
    });
  }

  async function handleDownload() {
    if (!boardRef.current) return;
    const dataUrl = await toPng(boardRef.current, { backgroundColor: "#0D0710", pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `tdf-tierlist-${game}.png`;
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

  async function handleSave() {
    setSaving(true);
    try {
      const result = await createTierList(game, tiers);
      navigate(`/tierlist/${result.id}`);
    } catch {
      setMessage("No se pudo guardar la tier list.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <SectionLabel index="09">Tier list</SectionLabel>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-3xl font-bold">Armá tu tier list</h1>
        <div className="flex gap-2 font-mono text-xs">
          {(["sf6", "3s"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`px-3 py-1 border transition-colors ${
                game === g
                  ? "border-tdf-magenta text-tdf-magenta"
                  : "border-tdf-line text-gray-500 hover:text-white"
              }`}
            >
              {g === "sf6" ? "SF6" : "3RD STRIKE"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-gray-500 mb-8 max-w-xl">
        Arrastrá cada personaje al tier que quieras. Cuando termines, la
        podés descargar como imagen, copiarla directo al portapapeles, o
        guardarla para compartir un link.
      </p>

      <DndContext onDragEnd={handleDragEnd}>
        <div ref={boardRef} className="bg-tdf-dark p-4">
          <div className="flex flex-col gap-1 mb-4">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="flex">
                <div
                  className={`w-16 shrink-0 flex items-center justify-center font-bold text-xl border ${TIER_COLORS[tier]}`}
                >
                  {tier}
                </div>
                <DroppableZone
                  id={tier}
                  className="flex-1 min-h-16 border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-2 items-start content-start"
                >
                  {tiers[tier].map((name) => (
                    <DraggableChip key={name} name={name} />
                  ))}
                </DroppableZone>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-xs uppercase text-gray-500 mb-2">Sin ranquear</p>
        <DroppableZone
          id="unplaced"
          className="border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-3 min-h-20"
        >
          {unplaced.map((name) => (
            <DraggableChip key={name} name={name} />
          ))}
        </DroppableZone>
      </DndContext>

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
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar y compartir"}
        </button>
      </div>
    </Layout>
  );
}
