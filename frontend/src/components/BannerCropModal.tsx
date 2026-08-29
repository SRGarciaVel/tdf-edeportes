import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";

// tamaño visual del editor (px de CSS) — igual de ancho que el modal,
// con la franja recortada (banner) en el medio y el resto de la
// imagen atenuado arriba/abajo, mismo formato que el editor de imagen
// de Discord (referencia que mandó Seba, 29-08-2026)
const STAGE_W = 420;
const ASPECT = 3; // ancho:alto del banner final — mismo criterio "cover"
// que ya usa el resto del sitio, pero acá el usuario elige QUÉ parte
const CROP_H = STAGE_W / ASPECT;
const STAGE_H = CROP_H * 2.6;
const DIM_HEIGHT = (STAGE_H - CROP_H) / 2;
const MAX_ZOOM_MULT = 3;
// resolución de salida — más grande que el stage visual para que no
// se vea pixelado en pantallas grandes, mismo criterio de compresión
// WebP que el resto de las subidas de imagen del sitio
const OUTPUT_W = 1200;
const OUTPUT_H = OUTPUT_W / ASPECT;

interface Offset {
  x: number;
  y: number;
}

/** Editor de recorte/zoom para el banner de /perfil — copia el
 * formato del editor de imagen de Discord (imagen atenuada arriba y
 * abajo, franja clara del tamaño real del recorte en el medio,
 * control de zoom, "Reiniciar"/"Cancelar"/"Aplicar"). Antes el banner
 * se subía con un recorte automático centrado sin control del usuario
 * (mismo comportamiento que el avatar/foto de fondo) — acá sí importa
 * dejar elegir qué parte de la imagen queda visible, porque el banner
 * es ancho y una foto vertical pierde la mayoría del encuadre con un
 * recorte automático. */
export default function BannerCropModal({
  file,
  onCancel,
  onApply,
}: {
  file: File;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoomMult, setZoomMult] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const dragState = useRef<{
    startX: number;
    startY: number;
    startOffset: Offset;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clamp(o: Offset, scale: number): Offset {
    const img = imgRef.current;
    if (!img) return o;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    return {
      x: Math.min(0, Math.max(STAGE_W - w, o.x)),
      y: Math.min(0, Math.max(STAGE_H - h, o.y)),
    };
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    // "cover": el lado más chico llena el stage entero (no solo la
    // franja recortada) — así hay contexto atenuado arriba/abajo para
    // ubicarse, igual que en la referencia de Discord
    const scale = Math.max(
      STAGE_W / img.naturalWidth,
      STAGE_H / img.naturalHeight,
    );
    setBaseScale(scale);
    setZoomMult(1);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    setOffset({ x: (STAGE_W - w) / 2, y: (STAGE_H - h) / 2 });
  }

  function handleReset() {
    const img = imgRef.current;
    if (!img) return;
    setZoomMult(1);
    const w = img.naturalWidth * baseScale;
    const h = img.naturalHeight * baseScale;
    setOffset({ x: (STAGE_W - w) / 2, y: (STAGE_H - h) / 2 });
  }

  function handleZoomChange(value: number) {
    setZoomMult(value);
    setOffset((o) => clamp(o, baseScale * value));
  }

  function startDrag(clientX: number, clientY: number) {
    dragState.current = {
      startX: clientX,
      startY: clientY,
      startOffset: offset,
    };
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragState.current) return;
    const { startX, startY, startOffset } = dragState.current;
    setOffset(
      clamp(
        {
          x: startOffset.x + (clientX - startX),
          y: startOffset.y + (clientY - startY),
        },
        baseScale * zoomMult,
      ),
    );
  }

  function endDrag() {
    dragState.current = null;
  }

  function handleApply() {
    const img = imgRef.current;
    if (!img) return;
    const scale = baseScale * zoomMult;
    // stage -> píxeles reales de la imagen fuente, tomando solo la
    // franja del medio (el recorte real, no el stage completo atenuado)
    const sx = (0 - offset.x) / scale;
    const sy = (DIM_HEIGHT - offset.y) / scale;
    const sw = STAGE_W / scale;
    const sh = CROP_H / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H);
    onApply(canvas.toDataURL("image/webp", 0.85));
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={endDrag}
    >
      <div
        className="hud-frame bg-tdf-charcoal flex flex-col"
        style={{ width: STAGE_W + 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tdf-line flex items-center justify-between shrink-0">
          <h2 className="font-semibold">Editar imagen</h2>
          <button
            onClick={onCancel}
            className="text-tdf-muted hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div
            className="relative overflow-hidden bg-black select-none"
            style={{ width: STAGE_W, height: STAGE_H, cursor: "grab" }}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onTouchStart={(e) =>
              startDrag(e.touches[0].clientX, e.touches[0].clientY)
            }
          >
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt=""
                draggable={false}
                onLoad={handleImageLoad}
                className="absolute"
                style={{
                  left: offset.x,
                  top: offset.y,
                  width: imgRef.current
                    ? imgRef.current.naturalWidth * baseScale * zoomMult
                    : undefined,
                  height: imgRef.current
                    ? imgRef.current.naturalHeight * baseScale * zoomMult
                    : undefined,
                  // el preflight de Tailwind le pone `max-width: 100%;
                  // height: auto` a TODO <img> por defecto — sin esto
                  // el ancho quedaba capado al ancho del stage (420px)
                  // pero el alto no, así que la imagen se veía
                  // estirada verticalmente y los cálculos de límites de
                  // arrastre (clamp) no coincidían con lo que
                  // realmente se veía en pantalla (bug reportado
                  // 29-08-2026: no se podía mover en vertical, y hacia
                  // la izquierda se veía fondo negro). maxWidth: "none"
                  // anula ese default puntual, sin tocar el resto de
                  // imágenes del sitio.
                  maxWidth: "none",
                  maxHeight: "none",
                  pointerEvents: "none",
                }}
              />
            )}
            {/* franjas atenuadas arriba/abajo del recorte real */}
            <div
              className="absolute inset-x-0 top-0 bg-black/70 pointer-events-none"
              style={{ height: DIM_HEIGHT }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-black/70 pointer-events-none"
              style={{ height: DIM_HEIGHT }}
            />
            {/* borde de la franja que sí queda en el banner final */}
            <div
              className="absolute inset-x-0 border-2 border-white pointer-events-none"
              style={{ top: DIM_HEIGHT, height: CROP_H }}
            />
          </div>

          <div className="flex items-center gap-3 mt-4">
            <ImageIcon size={14} className="text-tdf-muted shrink-0" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM_MULT}
              step={0.01}
              value={zoomMult}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="flex-1 accent-tdf-magenta"
            />
            <ImageIcon size={20} className="text-tdf-muted shrink-0" />
          </div>

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={handleReset}
              className="font-body text-sm text-tdf-magenta hover:text-white"
            >
              Reiniciar
            </button>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="font-body text-sm px-4 py-2 bg-tdf-dark border border-tdf-line hover:border-tdf-magenta transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={!imgSrc}
                className="font-body text-sm px-4 py-2 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
