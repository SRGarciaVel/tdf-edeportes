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
  listTierListTemplates,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type {
  TierItemData,
  TierListTemplateData,
  TierListTemplateSummaryData,
} from "../lib/types";

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
        className={`cursor-grab active:cursor-grabbing select-none touch-none ${
          isDragging ? "opacity-30 relative z-50" : ""
        }`}
      >
        <img src={item.image} alt={item.label} className="w-16 h-16 object-cover border border-tdf-line" />
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

  const [templates, setTemplates] = useState<TierListTemplateSummaryData[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<TierListTemplateData | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newItems, setNewItems] = useState<TierItemData[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<TierRow[]>(defaultRows());
  const [tiers, setTiers] = useState<Record<string, TierItemData[]>>(() => emptyTiers(defaultRows()));
  const [unplaced, setUnplaced] = useState<TierItemData[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listTierListTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const allItems = useMemo(
    () => [...unplaced, ...Object.values(tiers).flat()],
    [unplaced, tiers]
  );

  function loadIntoEditor(items: TierItemData[]) {
    const freshRows = defaultRows();
    setRows(freshRows);
    setTiers(emptyTiers(freshRows));
    setUnplaced(items);
  }

  async function handleSelectTemplate(summary: TierListTemplateSummaryData) {
    try {
      const full = await getTierListTemplate(summary.id);
      setActiveTemplate(full);
      loadIntoEditor(full.items);
    } catch {
      setMessage("No se pudo cargar esa plantilla.");
    }
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added: TierItemData[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const image = await resizeImageFile(file, 120);
        added.push({
          id: crypto.randomUUID(),
          label: file.name.replace(/\.[^.]+$/, "").slice(0, 30),
          image,
        });
      } catch {
        setMessage(`No se pudo procesar "${file.name}".`);
      }
    }
    setNewItems((prev) => [...prev, ...added]);
    e.target.value = "";
  }

  async function handleSaveNewTemplate() {
    if (!token) return;
    if (!newName.trim()) {
      setMessage("Ponle un nombre a la plantilla.");
      return;
    }
    if (newItems.length === 0) {
      setMessage("Sube al menos una imagen.");
      return;
    }
    setSavingTemplate(true);
    try {
      const template = await createTierListTemplate(newName.trim(), newItems, token);
      setActiveTemplate(template);
      loadIntoEditor(template.items);
      setCreating(false);
      setNewName("");
      setNewItems([]);
      listTierListTemplates().then(setTemplates).catch(() => {});
      setMessage(`Plantilla "${template.name}" creada.`);
    } catch {
      setMessage("No se pudo guardar la plantilla.");
    } finally {
      setSavingTemplate(false);
    }
  }

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

  async function handleSave() {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const idsOnly = Object.fromEntries(
        Object.entries(tiers).map(([tier, items]) => [tier, items.map((i) => i.id)])
      );
      const result = await createTierList(activeTemplate.id, idsOnly);
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
      <h1 className="text-3xl font-bold mb-2">Arma tu tier list</h1>
      <p className="text-gray-500 mb-8 max-w-xl">
        Elige una plantilla armada por la comunidad, o crea la tuya si
        tienes sesión iniciada. Arrastra cada ítem al tier que quieras,
        agrega o saca tiers con los botones de la derecha de cada fila, y
        cuando termines la puedes descargar como imagen, copiarla directo
        al portapapeles, o guardarla para compartir un link.
      </p>

      {!activeTemplate && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs uppercase text-gray-400">
              Plantillas de la comunidad
            </h2>
            {user ? (
              <button
                onClick={() => setCreating((v) => !v)}
                className="font-mono text-xs text-tdf-purple hover:text-tdf-magenta transition-colors"
              >
                {creating ? "Cancelar" : "+ Crear una nueva"}
              </button>
            ) : (
              <span className="font-mono text-[11px] text-gray-600">
                Inicia sesión con Twitch para crear una plantilla nueva.
              </span>
            )}
          </div>

          {creating && (
            <div className="hud-frame bg-tdf-charcoal px-5 py-4 mb-4 flex flex-col gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre de la plantilla"
                className="bg-tdf-dark border border-tdf-line px-3 py-2 text-sm"
              />
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
                  Se redimensionan solas a 120x120 — {newItems.length} cargada
                  {newItems.length === 1 ? "" : "s"}.
                </span>
              </div>
              {newItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newItems.map((item) => (
                    <img
                      key={item.id}
                      src={item.image ?? undefined}
                      alt={item.label}
                      className="w-12 h-12 object-cover border border-tdf-line"
                    />
                  ))}
                </div>
              )}
              <button
                onClick={handleSaveNewTemplate}
                disabled={savingTemplate}
                className="self-start bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white disabled:opacity-50"
              >
                {savingTemplate ? "Guardando..." : "Guardar plantilla y empezar"}
              </button>
            </div>
          )}

          {loadingTemplates && <p className="text-sm text-gray-600">Cargando...</p>}
          {!loadingTemplates && templates.length === 0 && (
            <p className="text-sm text-gray-600">
              Todavía no hay ninguna plantilla — sé el primero en crear una.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className="hud-frame bg-tdf-charcoal hover:border-tdf-magenta transition-colors px-5 py-4 text-left"
              >
                <p className="font-semibold">{t.name}</p>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  {t.item_count} ítem{t.item_count === 1 ? "" : "s"} · por{" "}
                  <span className="text-tdf-purple">{t.creator_name}</span>
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTemplate && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-xs text-gray-500">
              Usando: <span className="text-white">{activeTemplate.name}</span> · por{" "}
              <span className="text-tdf-purple">{activeTemplate.creator_name}</span>
            </p>
            <button
              onClick={() => setActiveTemplate(null)}
              className="font-mono text-xs text-gray-500 hover:text-white transition-colors"
            >
              ← Elegir otra plantilla
            </button>
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            <div ref={boardRef} className="bg-tdf-dark p-4">
              <div className="flex flex-col gap-1 mb-4">
                {rows.map((row, i) => (
                  <div key={row.id} className="flex">
                    <div className={`w-16 shrink-0 flex items-center justify-center border ${row.color}`}>
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
        </>
      )}

      {!activeTemplate && message && (
        <p className="font-mono text-xs text-tdf-magenta mt-4">{message}</p>
      )}
    </Layout>
  );
}
