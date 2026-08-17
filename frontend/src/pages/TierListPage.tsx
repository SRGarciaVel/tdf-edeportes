import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { toBlob, toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import {
  createTierList,
  createTierListTemplate,
  getTierListTemplate,
  listMyTierListTemplates,
} from "../lib/api";
import { SF6_ROSTER, THIRD_STRIKE_ROSTER, characterColorClass } from "../lib/characterColors";
import { resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type { TierItemData, TierListGame, TierListTemplateSummaryData } from "../lib/types";

interface TierRow {
  id: string;
  label: string;
  color: string;
}

const TIER_PALETTE = [
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

function defaultRows(): TierRow[] {
  return ["S", "A", "B", "C", "D"].map((label, i) => ({
    id: label,
    label,
    color: TIER_PALETTE[i],
  }));
}

function emptyTiers(rows: TierRow[]): Record<string, TierItemData[]> {
  return Object.fromEntries(rows.map((r) => [r.id, []]));
}

function rosterItemsFor(game: TierListGame): TierItemData[] {
  if (game === "custom") return [];
  const roster = game === "sf6" ? SF6_ROSTER : THIRD_STRIKE_ROSTER;
  return roster.map((name) => ({ id: name, label: name }));
}

function ItemChip({ item }: { item: TierItemData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  if (item.image) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none touch-none ${
          isDragging ? "opacity-30 relative z-50" : ""
        }`}
      >
        <img src={item.image} alt={item.label} className="w-16 h-16 object-cover border border-tdf-line" />
        {item.label && (
          <span className="text-[10px] font-mono text-gray-500 max-w-16 truncate">{item.label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`px-2 py-1 text-xs font-mono border border-current/40 bg-tdf-dark cursor-grab active:cursor-grabbing select-none touch-none ${characterColorClass(
        item.label
      )} ${isDragging ? "opacity-30 relative z-50" : ""}`}
    >
      {item.label}
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
  const { user, token } = useAuth();
  const [game, setGame] = useState<TierListGame>("sf6");
  const [rows, setRows] = useState<TierRow[]>(defaultRows());
  const [tiers, setTiers] = useState<Record<string, TierItemData[]>>(() => emptyTiers(defaultRows()));
  const [unplaced, setUnplaced] = useState<TierItemData[]>(rosterItemsFor("sf6"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [myTemplates, setMyTemplates] = useState<TierListTemplateSummaryData[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const freshRows = defaultRows();
    setRows(freshRows);
    setTiers(emptyTiers(freshRows));
    setUnplaced(rosterItemsFor(game));
  }, [game]);

  useEffect(() => {
    if (game === "custom" && token) {
      listMyTierListTemplates(token)
        .then(setMyTemplates)
        .catch(() => setMyTemplates([]));
    }
  }, [game, token]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  // todos los ítems que existen en este momento, estén donde estén — se
  // usa para encontrar de dónde sacar algo al soltarlo, y para guardar
  // una plantilla con TODO lo que hay cargado, no solo lo ya ranqueado
  const allItems = useMemo(
    () => [...unplaced, ...Object.values(tiers).flat()],
    [unplaced, tiers]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const itemId = String(active.id);
    const targetZone = String(over.id);
    const found = allItems.find((i) => i.id === itemId);
    if (!found) return;

    setTiers((prev) => {
      const next: Record<string, TierItemData[]> = {};
      for (const [tier, list] of Object.entries(prev)) {
        next[tier] = list.filter((i) => i.id !== itemId);
      }
      if (rows.some((r) => r.id === targetZone)) {
        next[targetZone] = [...(next[targetZone] ?? []), found];
      }
      return next;
    });

    setUnplaced((prev) => {
      const withoutItem = prev.filter((i) => i.id !== itemId);
      return targetZone === "unplaced" ? [...withoutItem, found] : withoutItem;
    });
  }

  function addRow() {
    const id = `tier-${Date.now()}`;
    const color = TIER_PALETTE[rows.length % TIER_PALETTE.length];
    setRows((prev) => [...prev, { id, label: "Nuevo", color }]);
    setTiers((prev) => ({ ...prev, [id]: [] }));
  }

  function removeRow(id: string) {
    setUnplaced((prev) => [...prev, ...(tiers[id] ?? [])]);
    setTiers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function renameRow(id: string, label: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, label } : r)));
  }

  function moveRow(id: string, direction: -1 | 1) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: TierItemData[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const image = await resizeImageFile(file, 120);
        newItems.push({
          id: crypto.randomUUID(),
          label: file.name.replace(/\.[^.]+$/, "").slice(0, 30),
          image,
        });
      } catch {
        setMessage(`No se pudo procesar "${file.name}".`);
      }
    }
    setUnplaced((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }

  async function handleLoadTemplate(templateId: string) {
    if (!token || !templateId) return;
    try {
      const template = await getTierListTemplate(templateId, token);
      const freshRows = defaultRows();
      setRows(freshRows);
      setTiers(emptyTiers(freshRows));
      setUnplaced(template.items);
      setMessage(`Cargada la plantilla "${template.name}".`);
    } catch {
      setMessage("No se pudo cargar esa plantilla.");
    }
  }

  async function handleSaveTemplate() {
    if (!token) return;
    if (allItems.length === 0) {
      setMessage("Subí al menos una imagen antes de guardar la plantilla.");
      return;
    }
    const name = window.prompt("Nombre para esta plantilla:");
    if (!name) return;
    setSavingTemplate(true);
    try {
      await createTierListTemplate(name, allItems, token);
      setMessage(`Plantilla "${name}" guardada.`);
      listMyTierListTemplates(token).then(setMyTemplates).catch(() => {});
    } catch {
      setMessage("No se pudo guardar la plantilla.");
    } finally {
      setSavingTemplate(false);
    }
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
    if (game === "custom" && !token) {
      setMessage("Iniciá sesión con Twitch para guardar una tier list personalizada.");
      return;
    }
    setSaving(true);
    try {
      const result = await createTierList(game, tiers, token);
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
          {(["sf6", "3s", "custom"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`px-3 py-1 border transition-colors ${
                game === g
                  ? "border-tdf-magenta text-tdf-magenta"
                  : "border-tdf-line text-gray-500 hover:text-white"
              }`}
            >
              {g === "sf6" ? "SF6" : g === "3s" ? "3RD STRIKE" : "PERSONALIZADA"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-gray-500 mb-6 max-w-xl">
        Arrastrá cada ítem al tier que quieras. Agregá o sacá tiers con los
        botones de la derecha de cada fila. Cuando termines, la podés
        descargar como imagen, copiarla directo al portapapeles, o
        guardarla para compartir un link.
      </p>

      {game === "custom" && (
        <div className="hud-frame bg-tdf-charcoal px-5 py-4 mb-8">
          {!user ? (
            <p className="text-sm text-gray-400">
              Las tier lists personalizadas necesitan que inicies sesión
              con Twitch — son imágenes que subís vos, y preferimos que
              queden asociadas a una cuenta real.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase"
              >
                Subir imágenes
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
              <span className="font-mono text-[11px] text-gray-600">
                Se redimensionan solas a 120x120.
              </span>

              <div className="w-px h-6 bg-tdf-line mx-1" />

              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase disabled:opacity-50"
              >
                {savingTemplate ? "Guardando..." : "Guardar como plantilla"}
              </button>

              {myTemplates.length > 0 && (
                <select
                  onChange={(e) => handleLoadTemplate(e.target.value)}
                  defaultValue=""
                  className="bg-tdf-dark border border-tdf-line px-2 py-2 font-mono text-xs text-gray-300"
                >
                  <option value="" disabled>
                    Cargar una plantilla mía...
                  </option>
                  {myTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.item_count})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div ref={boardRef} className="bg-tdf-dark p-4">
          <div className="flex flex-col gap-1 mb-4">
            {rows.map((row, i) => (
              <div key={row.id} className="flex">
                <div
                  className={`w-16 shrink-0 flex items-center justify-center border ${row.color}`}
                >
                  <input
                    value={row.label}
                    onChange={(e) => renameRow(row.id, e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-lg focus:outline-none"
                  />
                </div>
                <DroppableZone
                  id={row.id}
                  className="flex-1 min-h-16 border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-2 items-start content-start"
                >
                  {tiers[row.id]?.map((item) => (
                    <ItemChip key={item.id} item={item} />
                  ))}
                </DroppableZone>
                <div className="w-8 shrink-0 flex flex-col justify-center gap-0.5 pl-1">
                  <button
                    onClick={() => moveRow(row.id, -1)}
                    disabled={i === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                    aria-label="Subir tier"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveRow(row.id, 1)}
                    disabled={i === rows.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                    aria-label="Bajar tier"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="text-gray-500 hover:text-red-400 disabled:opacity-20 text-xs"
                    aria-label="Borrar tier"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="font-mono text-xs text-tdf-purple hover:text-tdf-magenta transition-colors mb-6"
          >
            + Agregar tier
          </button>

          <p className="font-mono text-xs uppercase text-gray-500 mb-2">Sin ranquear</p>
          <DroppableZone
            id="unplaced"
            className="border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-3 min-h-20"
          >
            {unplaced.map((item) => (
              <ItemChip key={item.id} item={item} />
            ))}
          </DroppableZone>
        </div>
      </DndContext>

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
