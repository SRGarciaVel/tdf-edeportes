import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toBlob, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  createTierList,
  createTierListTemplate,
  deleteTierListTemplate,
  addTierListTemplateItems,
  deleteTierListTemplateItem,
  getTierListTemplate,
  listTierListTemplates,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { resizeImageFile } from "../lib/imageResize";
import { useAuth } from "../lib/auth";
import type {
  TierItemData,
  TierMetaData,
  TierListTemplateData,
  TierListTemplateSummaryData,
} from "../lib/types";

interface TierRow {
  id: string;
  label: string;
  color: string;
}

const UNPLACED_ID = "unplaced";

const TIER_PALETTE = [
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

/** Barra angosta al borde de la caja de color — arrastrarla ajusta
 * labelWidth para TODAS las filas a la vez (es un solo ancho compartido,
 * no uno por tier, para que las cajas de color se sigan viendo alineadas
 * entre sí como en TierMaker). data-export-exclude porque es un control
 * de edición, no debe aparecer en el PNG descargado. */
function LabelWidthHandle({
  width,
  onChange,
}: {
  width: number;
  onChange: (w: number) => void;
}) {
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    function onMove(moveEvent: PointerEvent) {
      const next = Math.min(
        240,
        Math.max(48, startWidth + (moveEvent.clientX - startX)),
      );
      onChange(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      data-export-exclude="true"
      className="w-2 shrink-0 cursor-col-resize bg-tdf-line hover:bg-tdf-magenta transition-colors"
      title="Arrastra para ajustar el ancho de los nombres"
      role="separator"
      aria-orientation="vertical"
      aria-label="Ajustar ancho de los nombres de tier"
    />
  );
}

/** Texto editable directo en la caja de color (además del campo del
 * popup del engranaje — ambos escriben sobre el mismo row.label, no son
 * dos fuentes de verdad separadas). contentEditable en vez de un
 * <textarea>: crece solo con el contenido sin ningún truco de JS, y a
 * diferencia de un <textarea> es contenido de texto real del DOM — un
 * <textarea> puede no capturar bien su valor tipeado al exportar a PNG
 * con html-to-image (clona el DOM; el value de un form control es un
 * caso conocido problemático para esas librerías), mientras que texto
 * real sí exporta bien, es lo mismo que ya hacía el <span> de antes. */
function TierLabelEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // solo pisa el contenido visible cuando cambia desde AFUERA (ej. el
  // campo del popup del engranaje) — si esto corriera en cada tecla acá
  // mismo, el cursor saltaría al final del texto en cada letra escrita
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        // Enter confirma en vez de meter un salto de línea literal —
        // sigue siendo el nombre de un tier, no un párrafo
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      role="textbox"
      aria-label="Nombre del tier"
      className="w-full text-center font-bold text-lg leading-tight break-words outline-none"
    />
  );
}

/** Ítem arrastrable Y reordenable (a diferencia de useDraggable solo, esto
 * sabe insertarse en una posición exacta dentro de una lista, no solo
 * "moverse a algún contenedor" — es lo que permite acomodar de derecha a
 * izquierda, insertar en el medio, etc. Ver lessons.md. */
function ItemChip({
  item,
  onDelete,
}: {
  item: TierItemData;
  onDelete?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // el botón de borrar va como HERMANO del div arrastrable, nunca
  // anidado adentro — si estuviera adentro, el pointerdown del botón
  // burbujearía hasta los listeners de dnd-kit (que están en el div
  // padre) y podría interpretarse como el inicio de un drag en vez de
  // un click
  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`cursor-grab active:cursor-grabbing select-none touch-none ${
          isDragging ? "opacity-30 relative z-50" : ""
        }`}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.label}
            className="w-24 h-24 object-cover border border-tdf-line"
          />
        ) : (
          <span
            className={`inline-block px-2 py-1 text-sm font-mono border border-current/40 bg-tdf-dark ${characterColorClass(
              item.label,
            )}`}
          >
            {item.label}
          </span>
        )}
      </div>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-red-500/90 hover:bg-red-500 text-white text-[10px] leading-none rounded-full z-10"
          aria-label={`Borrar ${item.label} de la plantilla`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Clon puramente visual del ítem que se está arrastrando, renderizado por
 * <DragOverlay> en un portal aparte que sigue al cursor/dedo en todo
 * momento. ItemChip solo se anima "in place" dentro de su propia grilla
 * (con rectSortingStrategy) — sin esto, el ítem original se queda opaco
 * en su celda pero nada visible se mueve con el puntero, que es la queja
 * de Seba: no se siente como que estás "sosteniendo" la imagen. */
function ItemPreview({ item }: { item: TierItemData }) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.label}
        className="w-24 h-24 object-cover border-2 border-tdf-magenta shadow-[0_8px_24px_rgba(0,0,0,0.6)] rotate-3 cursor-grabbing"
      />
    );
  }
  return (
    <div
      className={`px-2 py-1 text-sm font-mono border-2 border-tdf-magenta bg-tdf-dark shadow-[0_8px_24px_rgba(0,0,0,0.6)] rotate-3 cursor-grabbing ${characterColorClass(
        item.label,
      )}`}
    >
      {item.label}
    </div>
  );
}

/** El contenedor de cada fila/bandeja — SortableContext (para poder
 * reordenar e insertar en posición) envuelto en un useDroppable (para que
 * un contenedor vacío, o soltar en el espacio libre después del último
 * ítem, también cuente como un destino válido). */
function SortableZone({
  id,
  items,
  className,
  children,
}: {
  id: string;
  items: TierItemData[];
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext
      items={items.map((i) => i.id)}
      strategy={rectSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={`${className} ${isOver ? "outline outline-2 outline-tdf-magenta" : ""}`}
      >
        {children}
      </div>
    </SortableContext>
  );
}

export default function TierListPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [templates, setTemplates] = useState<TierListTemplateSummaryData[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [activeTemplate, setActiveTemplate] =
    useState<TierListTemplateData | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null,
  );
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] =
    useState<TierListTemplateSummaryData | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newItems, setNewItems] = useState<TierItemData[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addItemsInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<TierRow[]>(defaultRows());
  const [tiers, setTiers] = useState<Record<string, TierItemData[]>>(() =>
    emptyTiers(defaultRows()),
  );
  const [unplaced, setUnplaced] = useState<TierItemData[]>([]);
  const [activeItem, setActiveItem] = useState<TierItemData | null>(null);
  const [settingsRowId, setSettingsRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] =
    useState<TierItemData | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [labelWidth, setLabelWidth] = useState(64);
  // separado del resto de la página — es lo único que se captura al
  // exportar como imagen, sin los botones de editar tiers ni "sin
  // ranquear" (ver lessons.md, antes se exportaba todo junto)
  const exportRef = useRef<HTMLDivElement>(null);

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

  function loadIntoEditor(items: TierItemData[]) {
    const freshRows = defaultRows();
    setRows(freshRows);
    setTiers(emptyTiers(freshRows));
    setUnplaced(items);
    setEditMode(false);
    setLabelWidth(64);
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

  // solo el botón visible a staff (ver el render más abajo) puede llegar
  // a llamar esto, pero el backend también valida is_staff en el DELETE
  // — no confiamos únicamente en ocultar el botón en el frontend.
  // La confirmación ya no es window.confirm() del navegador (rompía con
  // la estética del sitio) — vive en el popup propio, ver más abajo.
  async function handleDeleteTemplate(summary: TierListTemplateSummaryData) {
    if (!token) return;
    setDeletingTemplateId(summary.id);
    try {
      await deleteTierListTemplate(token, summary.id);
      setTemplates((prev) => prev.filter((t) => t.id !== summary.id));
      setMessage(`Plantilla "${summary.name}" borrada.`);
    } catch {
      setMessage("No se pudo borrar la plantilla.");
    } finally {
      setDeletingTemplateId(null);
      setConfirmDeleteTemplate(null);
    }
  }

  // solo se puede llegar acá si canEditTemplateItems es true (ver más
  // abajo, gear ✕ en cada ItemChip) — pero el backend también valida
  // "creador O staff" en el DELETE, no se confía solo en ocultar el
  // botón en el frontend
  async function handleDeleteItem(item: TierItemData) {
    if (!token || !activeTemplate) return;
    setDeletingItemId(item.id);
    try {
      await deleteTierListTemplateItem(token, activeTemplate.id, item.id);
      // sacarlo de todos lados donde pueda estar: sin ranquear, o ya
      // puesto en algún tier
      setUnplaced((prev) => prev.filter((i) => i.id !== item.id));
      setTiers((prev) => {
        const next: Record<string, TierItemData[]> = {};
        for (const [tierId, items] of Object.entries(prev)) {
          next[tierId] = items.filter((i) => i.id !== item.id);
        }
        return next;
      });
      setActiveTemplate((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) }
          : prev,
      );
      setMessage(`"${item.label}" borrado de la plantilla.`);
    } catch {
      setMessage("No se pudo borrar el ítem.");
    } finally {
      setDeletingItemId(null);
      setConfirmDeleteItem(null);
    }
  }

  // agregar imágenes a una plantilla YA guardada — a diferencia de
  // handleFilesSelected (que junta ítems en newItems mientras se arma
  // una plantilla nueva), esto pega directo al backend y actualiza la
  // plantilla activa apenas responde. Pedido real de Seba, 22-08-2026:
  // "se le haya olvidado agregar una imagen" al crearla la primera vez.
  const [addingItems, setAddingItems] = useState(false);

  async function handleAddItemsToTemplate(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = e.target.files;
    if (!token || !activeTemplate || !files || files.length === 0) return;

    const toAdd: TierItemData[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const image = await resizeImageFile(file, 120);
        toAdd.push({
          id: crypto.randomUUID(),
          label: file.name.replace(/\.[^.]+$/, "").slice(0, 30),
          image,
        });
      } catch {
        setMessage(`No se pudo procesar "${file.name}".`);
      }
    }
    e.target.value = "";
    if (toAdd.length === 0) return;

    setAddingItems(true);
    try {
      const updated = await addTierListTemplateItems(
        token,
        activeTemplate.id,
        toAdd,
      );
      setActiveTemplate(updated);
      // los nuevos ítems arrancan "sin ranquear", igual que cuando se
      // arma una plantilla nueva
      const newlyAdded = updated.items.filter((i) =>
        toAdd.some((a) => a.id === i.id),
      );
      setUnplaced((prev) => [...prev, ...newlyAdded]);
      setMessage(
        toAdd.length === 1
          ? "1 imagen agregada a la plantilla."
          : `${toAdd.length} imágenes agregadas a la plantilla.`,
      );
    } catch {
      setMessage("No se pudieron agregar las imágenes.");
    } finally {
      setAddingItems(false);
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
      const template = await createTierListTemplate(
        newName.trim(),
        newItems,
        token,
      );
      setActiveTemplate(template);
      loadIntoEditor(template.items);
      setCreating(false);
      setNewName("");
      setNewItems([]);
      listTierListTemplates()
        .then(setTemplates)
        .catch(() => {});
      setMessage(`Plantilla "${template.name}" creada.`);
    } catch {
      setMessage("No se pudo guardar la plantilla.");
    } finally {
      setSavingTemplate(false);
    }
  }

  function getContainerList(containerId: string): TierItemData[] {
    return containerId === UNPLACED_ID ? unplaced : (tiers[containerId] ?? []);
  }

  function setContainerList(containerId: string, list: TierItemData[]) {
    if (containerId === UNPLACED_ID) setUnplaced(list);
    else setTiers((prev) => ({ ...prev, [containerId]: list }));
  }

  /** A qué contenedor pertenece un id — puede ser el id de un contenedor
   * en sí (se soltó sobre espacio vacío) o el id de un ítem que ya está
   * adentro de alguno (se soltó sobre/al lado de otro ítem, para
   * insertarse en esa posición exacta). */
  function findContainer(id: string): string | undefined {
    if (id === UNPLACED_ID || rows.some((r) => r.id === id)) return id;
    if (unplaced.some((i) => i.id === id)) return UNPLACED_ID;
    for (const [tierId, items] of Object.entries(tiers)) {
      if (items.some((i) => i.id === id)) return tierId;
    }
    return undefined;
  }

  function findItem(id: string): TierItemData | undefined {
    return (
      unplaced.find((i) => i.id === id) ??
      Object.values(tiers)
        .flat()
        .find((i) => i.id === id)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveItem(findItem(String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceContainer = findContainer(activeId);
    const destContainer = findContainer(overId);
    if (!sourceContainer || !destContainer) return;

    const sourceList = getContainerList(sourceContainer);
    const activeIndex = sourceList.findIndex((i) => i.id === activeId);
    if (activeIndex === -1) return;
    const item = sourceList[activeIndex];

    if (sourceContainer === destContainer) {
      // reordenar dentro del mismo tier/bandeja — esto es lo que antes
      // no funcionaba: solo se podía mandar al final, nunca insertar en
      // una posición puntual (ver lessons.md)
      const overIndex = sourceList.findIndex((i) => i.id === overId);
      const newIndex = overIndex === -1 ? sourceList.length - 1 : overIndex;
      setContainerList(
        sourceContainer,
        arrayMove(sourceList, activeIndex, newIndex),
      );
      return;
    }

    // mover entre contenedores distintos, insertando en la posición
    // exacta donde se soltó (no siempre al final)
    const destList = getContainerList(destContainer);
    const overIndex = destList.findIndex((i) => i.id === overId);
    const insertAt = overIndex === -1 ? destList.length : overIndex;

    setContainerList(
      sourceContainer,
      sourceList.filter((i) => i.id !== activeId),
    );
    setContainerList(destContainer, [
      ...destList.slice(0, insertAt),
      item,
      ...destList.slice(insertAt),
    ]);
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

  function changeRowColor(id: string, color: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, color } : r)));
  }

  /** "Vaciar imágenes" del popup — a diferencia de borrar el tier entero,
   * esto solo devuelve sus ítems a "sin ranquear" y deja la fila vacía
   * lista para seguir usándose (equivalente a "Clear Row Images" de
   * TierMaker). */
  function clearRowImages(id: string) {
    setUnplaced((prev) => [...prev, ...(tiers[id] ?? [])]);
    setTiers((prev) => ({ ...prev, [id]: [] }));
  }

  /** A diferencia de addRow (que siempre agrega al final), esto inserta
   * una fila nueva arriba o abajo de una fila puntual — lo que ofrece el
   * popup de configuración de TierMaker ("Add a Row Above/Below"). */
  function addRowAt(anchorId: string, position: "above" | "below") {
    const newId = `tier-${Date.now()}`;
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === anchorId);
      if (idx === -1) return prev;
      const color = TIER_PALETTE[prev.length % TIER_PALETTE.length];
      const insertAt = position === "above" ? idx : idx + 1;
      const next = [...prev];
      next.splice(insertAt, 0, { id: newId, label: "Nuevo", color });
      return next;
    });
    setTiers((prev) => ({ ...prev, [newId]: [] }));
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

  // los controles de cada tier (renombrar, subir/bajar, borrar) ahora
  // viven DENTRO de la misma fila que se exporta (ver fila de cada tier
  // más abajo) — este filtro es lo que los excluye de la imagen final sin
  // tener que mantenerlos en un contenedor DOM aparte
  function exportFilter(node: HTMLElement) {
    return node.dataset?.exportExclude !== "true";
  }

  async function handleDownload() {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, {
      backgroundColor: "#0D0710",
      pixelRatio: 2,
      filter: exportFilter,
    });
    const link = document.createElement("a");
    link.download = "tdf-tierlist.png";
    link.href = dataUrl;
    link.click();
  }

  async function handleCopyImage() {
    if (!exportRef.current) return;
    try {
      const blob = await toBlob(exportRef.current, {
        backgroundColor: "#0D0710",
        pixelRatio: 2,
        filter: exportFilter,
      });
      if (!blob) throw new Error("sin blob");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setMessage("Imagen copiada al portapapeles.");
    } catch {
      setMessage(
        "No se pudo copiar la imagen en este navegador. Descárgala en su lugar.",
      );
    }
  }

  async function handleSave() {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const idsOnly = Object.fromEntries(
        Object.entries(tiers).map(([tier, items]) => [
          tier,
          items.map((i) => i.id),
        ]),
      );
      // rows ya está en el orden real que se ve en pantalla (se puede
      // reordenar con las flechas ▲▼ de cada fila) — es la fuente de
      // verdad del orden, se manda tal cual en vez de confiar en el
      // orden de las keys de idsOnly (que Postgres JSONB no preserva).
      // row.label puede venir de un renombre (la tuerca del editor) —
      // antes de esto, renombrar un tier nunca se guardaba, la vista
      // compartida siempre mostraba el id original ("S") sin importar
      // qué se hubiera escrito
      const tierMeta: TierMetaData[] = rows.map((r) => ({
        id: r.id,
        label: r.label,
        color: r.color,
      }));
      // logueado: el backend usa el display_name de Twitch y este valor
      // se ignora, así que da lo mismo mandarlo o no. Sin login: se
      // manda el nombre que escribió (si escribió algo), el backend cae
      // a "Anónimo" si viene vacío
      const result = await createTierList(
        activeTemplate.id,
        idsOnly,
        tierMeta,
        labelWidth,
        user ? undefined : guestName.trim() || undefined,
        token,
      );
      navigate(`/tierlist/${result.id}`);
    } catch {
      setMessage("No se pudo guardar la tier list.");
    } finally {
      setSaving(false);
    }
  }

  const settingsRow = rows.find((r) => r.id === settingsRowId) ?? null;
  // quien creó esta plantilla, o cualquier staff — no cualquiera con
  // sesión iniciada. El backend valida lo mismo en el DELETE, esto solo
  // decide si se muestra el botón de "Editar" que activa editMode
  const canEditTemplateItems =
    !!activeTemplate &&
    !!user &&
    (user.is_staff || user.id === activeTemplate.created_by);
  // la "✕" en cada imagen NO está siempre visible — solo aparece con
  // editMode activo (toggle explícito), como en cualquier galería
  // (Google Photos, Notion, etc.), para evitar borrados accidentales al
  // hacer click cerca del botón mientras se arrastra o se navega
  const showItemDeleteButtons = canEditTemplateItems && editMode;

  return (
    <Layout>
      <SectionLabel index="09">Tier list</SectionLabel>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold">Arma tu tier list</h1>
        <Link
          to="/tierlist/comunidad"
          className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline whitespace-nowrap mt-2"
        >
          Ver tier lists de la comunidad →
        </Link>
      </div>
      <p className="text-tdf-muted mb-8 max-w-xl font-body">
        Elige una plantilla armada por la comunidad, o crea la tuya si tienes
        sesión iniciada. Arrastra cada ítem al tier que quieras (y también
        dentro de un mismo tier, para reordenar), agrega o saca tiers con los
        botones de la derecha de cada fila, y cuando termines la puedes
        descargar como imagen, copiarla directo al portapapeles, o guardarla
        para compartir un link.
      </p>

      {!activeTemplate && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs uppercase text-tdf-muted">
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
              <span className="font-mono text-[11px] text-tdf-muted">
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
                <span className="font-mono text-[11px] text-tdf-muted">
                  Se redimensionan solas a 120x120, {newItems.length} cargada
                  {newItems.length === 1 ? "" : "s"}.
                </span>
              </div>
              {newItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newItems.map((item) => (
                    <div key={item.id} className="relative">
                      <img
                        src={item.image ?? undefined}
                        alt={item.label}
                        className="w-12 h-12 object-cover border border-tdf-line"
                      />
                      <button
                        onClick={() =>
                          setNewItems((prev) =>
                            prev.filter((i) => i.id !== item.id),
                          )
                        }
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-red-500/90 hover:bg-red-500 text-white text-[10px] leading-none rounded-full"
                        aria-label={`Sacar ${item.label} antes de guardar`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleSaveNewTemplate}
                disabled={savingTemplate}
                className="self-start bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white disabled:opacity-50"
              >
                {savingTemplate
                  ? "Guardando..."
                  : "Guardar plantilla y empezar"}
              </button>
            </div>
          )}

          {loadingTemplates && (
            <div className="grid sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="hud-frame bg-tdf-charcoal">
                  <Skeleton className="h-16 w-full" />
                  <div className="px-5 py-4 flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingTemplates && templates.length === 0 && (
            <p className="text-sm text-tdf-muted font-body">
              Todavía no hay ninguna plantilla, sé el primero en crear una.
            </p>
          )}
          {!loadingTemplates && templates.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="hud-frame bg-tdf-charcoal hover:border-tdf-magenta transition-colors relative overflow-hidden"
                >
                  <button
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left"
                  >
                    {t.sample_images.length > 0 && (
                      <div className="flex h-16">
                        {t.sample_images.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="flex-1 h-full object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <div
                      className={`px-5 py-4 ${user?.is_staff ? "pr-6" : ""}`}
                    >
                      <p className="font-semibold">{t.name}</p>
                      <p className="font-mono text-xs text-tdf-muted mt-1">
                        {t.item_count} ítem{t.item_count === 1 ? "" : "s"} · por{" "}
                        <span className="text-white">{t.creator_name}</span>
                      </p>
                    </div>
                  </button>
                  {/* solo staff ve esto — el backend también valida
                    is_staff en el DELETE, ver deleteTierListTemplate */}
                  {user?.is_staff && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteTemplate(t);
                      }}
                      disabled={deletingTemplateId === t.id}
                      className="absolute top-2 right-2 text-tdf-muted hover:text-red-400 disabled:opacity-30 text-xs px-1.5 py-1 bg-tdf-dark/70"
                      aria-label={`Borrar plantilla ${t.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* popup propio de confirmación, en vez de window.confirm() del
              navegador — mismo patrón visual que el popup de configurar
              tier más abajo, así todos los "¿estás seguro?" del sitio se
              ven iguales entre sí */}
          {confirmDeleteTemplate && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
              onClick={() => setConfirmDeleteTemplate(null)}
            >
              <div
                className="hud-frame bg-tdf-charcoal border border-tdf-line w-full max-w-sm p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-xs uppercase text-red-400">
                    Borrar plantilla
                  </h3>
                  <button
                    onClick={() => setConfirmDeleteTemplate(null)}
                    className="text-tdf-muted hover:text-white text-sm"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-sm text-gray-200 mb-2">
                  ¿Borrar{" "}
                  <span className="font-semibold text-white">
                    "{confirmDeleteTemplate.name}"
                  </span>
                  ?
                </p>
                <p className="font-mono text-[11px] text-tdf-muted mb-5">
                  Los rankings ya compartidos con esta plantilla van a seguir
                  funcionando igual, pero nadie va a poder crear uno nuevo con
                  ella.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDeleteTemplate(null)}
                    className="border border-tdf-line hover:border-white transition-colors px-4 py-2 font-mono text-[11px] uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(confirmDeleteTemplate)}
                    disabled={deletingTemplateId === confirmDeleteTemplate.id}
                    className="bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors px-4 py-2 font-mono text-[11px] uppercase text-red-300 disabled:opacity-50"
                  >
                    {deletingTemplateId === confirmDeleteTemplate.id
                      ? "Borrando..."
                      : "Borrar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTemplate && (
        <>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="font-mono text-xs text-tdf-muted">
              Usando: <span className="text-white">{activeTemplate.name}</span>{" "}
              · por{" "}
              <span className="text-tdf-purple">
                {activeTemplate.creator_name}
              </span>
            </p>
            <div className="flex items-center gap-3">
              {canEditTemplateItems && (
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`font-mono text-xs uppercase px-3 py-1.5 border transition-colors ${
                    editMode
                      ? "bg-tdf-magenta border-tdf-magenta text-white"
                      : "border-tdf-line text-tdf-muted hover:border-tdf-magenta hover:text-white"
                  }`}
                >
                  {editMode ? "Listo" : "Editar"}
                </button>
              )}
              {/* subir imágenes nuevas a la plantilla ya guardada — solo
                  visible en modo edición, mismo criterio que la "✕" de
                  borrar cada ítem (evita cambios accidentales fuera de
                  ese modo). Pedido real de Seba, 22-08-2026. */}
              {canEditTemplateItems && editMode && (
                <>
                  <button
                    onClick={() => addItemsInputRef.current?.click()}
                    disabled={addingItems}
                    className="font-mono text-xs uppercase px-3 py-1.5 border border-tdf-line text-tdf-muted hover:border-tdf-magenta hover:text-white transition-colors disabled:opacity-50"
                  >
                    {addingItems ? "Subiendo..." : "+ Agregar imágenes"}
                  </button>
                  <input
                    ref={addItemsInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddItemsToTemplate}
                    className="hidden"
                  />
                </>
              )}
              <button
                onClick={() => setActiveTemplate(null)}
                className="font-mono text-xs text-tdf-muted hover:text-white transition-colors"
              >
                ← Elegir otra plantilla
              </button>
            </div>
          </div>

          {editMode && (
            <p className="font-mono text-[11px] text-tdf-magenta mb-4">
              Modo edición activo: toca la "✕" de cualquier imagen para borrarla
              de la plantilla. Toca "Listo" cuando termines.
            </p>
          )}

          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Cada fila combina tier + controles en una sola línea (como
                TierMaker) — pero solo el tier (label + bandeja) importa
                visualmente al exportar; los controles llevan
                data-export-exclude y el filtro de toPng/toBlob los saca
                de la imagen final sin tener que mantenerlos en un
                contenedor DOM aparte (ver exportFilter). */}
            <div
              ref={exportRef}
              className="bg-tdf-dark p-4 flex flex-col gap-1 mb-1"
            >
              {rows.map((row, i) => (
                <div key={row.id} className="flex">
                  <div
                    style={{ width: labelWidth }}
                    className={`min-w-0 shrink-0 flex items-center justify-center border px-1 py-2 ${row.color}`}
                  >
                    <TierLabelEditor
                      value={row.label}
                      onChange={(v) => renameRow(row.id, v)}
                    />
                  </div>
                  <LabelWidthHandle
                    width={labelWidth}
                    onChange={setLabelWidth}
                  />
                  <SortableZone
                    id={row.id}
                    items={tiers[row.id] ?? []}
                    className="flex-1 min-h-24 border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-2 items-start content-start"
                  >
                    {tiers[row.id]?.map((item) => (
                      <ItemChip
                        key={item.id}
                        item={item}
                        onDelete={
                          showItemDeleteButtons
                            ? () => setConfirmDeleteItem(item)
                            : undefined
                        }
                      />
                    ))}
                  </SortableZone>
                  <div
                    data-export-exclude="true"
                    className="w-20 shrink-0 bg-black/70 border border-tdf-line border-l-0 flex items-center justify-center gap-2 px-2"
                  >
                    <button
                      onClick={() => setSettingsRowId(row.id)}
                      className="text-tdf-muted hover:text-tdf-magenta transition-colors text-sm leading-none"
                      aria-label="Configurar tier"
                    >
                      ⚙
                    </button>
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveRow(row.id, -1)}
                        disabled={i === 0}
                        className="text-tdf-muted hover:text-white disabled:opacity-20 text-[10px] leading-none px-1"
                        aria-label="Subir tier"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveRow(row.id, 1)}
                        disabled={i === rows.length - 1}
                        className="text-tdf-muted hover:text-white disabled:opacity-20 text-[10px] leading-none px-1"
                        aria-label="Bajar tier"
                      >
                        ▼
                      </button>
                    </div>
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

            <p className="font-mono text-xs uppercase text-tdf-muted mb-2">
              Sin ranquear
            </p>
            <SortableZone
              id={UNPLACED_ID}
              items={unplaced}
              className="border border-tdf-line bg-tdf-charcoal flex flex-wrap gap-2 p-3 min-h-28"
            >
              {unplaced.map((item) => (
                <ItemChip
                  key={item.id}
                  item={item}
                  onDelete={
                    showItemDeleteButtons
                      ? () => setConfirmDeleteItem(item)
                      : undefined
                  }
                />
              ))}
            </SortableZone>

            {/* sigue al cursor/dedo mientras se arrastra — le da la
                sensación de "estar sosteniendo" la imagen. Antes el ítem
                original solo se ponía opaco en su celda de origen, nada
                visible se movía junto con el puntero. */}
            <DragOverlay dropAnimation={null}>
              {activeItem ? <ItemPreview item={activeItem} /> : null}
            </DragOverlay>
          </DndContext>

          {/* popup de configuración del tier, abierto desde la tuerca de
              cada fila — mismo state (row.label, row.color) que la celda
              de color, así renombrar o cambiar el color acá se refleja
              de inmediato ahí, no son dos fuentes de verdad separadas */}
          {settingsRow && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
              onClick={() => setSettingsRowId(null)}
            >
              <div
                className="hud-frame bg-tdf-charcoal border border-tdf-line w-full max-w-sm p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-xs uppercase text-tdf-muted">
                    Editar tier
                  </h3>
                  <button
                    onClick={() => setSettingsRowId(null)}
                    className="text-tdf-muted hover:text-white text-sm"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
                  Color
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {TIER_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => changeRowColor(settingsRow.id, color)}
                      className={`w-7 h-7 border-2 ${color} ${
                        settingsRow.color === color
                          ? "border-white"
                          : "border-transparent"
                      }`}
                      aria-label="Elegir color del tier"
                    />
                  ))}
                </div>

                <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
                  Nombre
                </p>
                <input
                  value={settingsRow.label}
                  onChange={(e) => renameRow(settingsRow.id, e.target.value)}
                  className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-mono mb-4"
                  autoFocus
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      removeRow(settingsRow.id);
                      setSettingsRowId(null);
                    }}
                    disabled={rows.length <= 1}
                    className="border border-tdf-line hover:border-red-400 hover:text-red-400 transition-colors px-3 py-2 font-mono text-[11px] uppercase disabled:opacity-30"
                  >
                    Borrar tier
                  </button>
                  <button
                    onClick={() => clearRowImages(settingsRow.id)}
                    className="border border-tdf-line hover:border-tdf-magenta transition-colors px-3 py-2 font-mono text-[11px] uppercase"
                  >
                    Vaciar imágenes
                  </button>
                  <button
                    onClick={() => addRowAt(settingsRow.id, "above")}
                    className="border border-tdf-line hover:border-tdf-magenta transition-colors px-3 py-2 font-mono text-[11px] uppercase"
                  >
                    Agregar arriba
                  </button>
                  <button
                    onClick={() => addRowAt(settingsRow.id, "below")}
                    className="border border-tdf-line hover:border-tdf-magenta transition-colors px-3 py-2 font-mono text-[11px] uppercase"
                  >
                    Agregar abajo
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <p className="font-mono text-xs text-tdf-magenta mt-4">{message}</p>
          )}

          {/* solo si no hay sesión iniciada — logueado, el nombre en la
              galería sale directo del display_name de Twitch, no hace
              falta pedir nada acá */}
          {!user && (
            <div className="mt-6 flex flex-col gap-1.5 max-w-xs">
              <label
                htmlFor="guest-name"
                className="font-mono text-[11px] uppercase text-tdf-muted"
              >
                Tu nombre (para la galería de la comunidad)
              </label>
              <input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Anónimo"
                maxLength={40}
                className="bg-tdf-dark border border-tdf-line px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
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

          {/* confirmar antes de borrar un ítem de la plantilla (no el
              ranking en curso, la plantilla en sí) — mismo patrón visual
              que el popup de borrar plantilla completa, arriba */}
          {confirmDeleteItem && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
              onClick={() => setConfirmDeleteItem(null)}
            >
              <div
                className="hud-frame bg-tdf-charcoal border border-tdf-line w-full max-w-sm p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-xs uppercase text-red-400">
                    Borrar ítem de la plantilla
                  </h3>
                  <button
                    onClick={() => setConfirmDeleteItem(null)}
                    className="text-tdf-muted hover:text-white text-sm"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  {confirmDeleteItem.image && (
                    <img
                      src={confirmDeleteItem.image}
                      alt={confirmDeleteItem.label}
                      className="w-12 h-12 object-cover border border-tdf-line shrink-0"
                    />
                  )}
                  <p className="text-sm text-gray-200">
                    ¿Borrar{" "}
                    <span className="font-semibold text-white">
                      "{confirmDeleteItem.label}"
                    </span>{" "}
                    de esta plantilla? Esto le va a faltar a cualquiera que la
                    use de acá en más. Los rankings que ya la usaron no se ven
                    afectados.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDeleteItem(null)}
                    className="border border-tdf-line hover:border-white transition-colors px-4 py-2 font-mono text-[11px] uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteItem(confirmDeleteItem)}
                    disabled={deletingItemId === confirmDeleteItem.id}
                    className="bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors px-4 py-2 font-mono text-[11px] uppercase text-red-300 disabled:opacity-50"
                  >
                    {deletingItemId === confirmDeleteItem.id
                      ? "Borrando..."
                      : "Borrar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!activeTemplate && message && (
        <p className="font-mono text-xs text-tdf-magenta mt-4">{message}</p>
      )}
    </Layout>
  );
}
