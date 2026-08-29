import { toPng } from "html-to-image";

// mismo filtro que ya usa TierListPage: cualquier nodo marcado con
// data-export-exclude="true" (botones de descarga/borrar, no tiene
// sentido que salgan en la imagen final) queda afuera del render
function exportFilter(node: HTMLElement) {
  return node.dataset?.exportExclude !== "true";
}

/** Descarga un nodo del DOM como PNG — mismas opciones (fondo, escala,
 * filtro de exclusión) que ya usa TierListPage para su export, para
 * que las imágenes que salgan del sitio se vean consistentes entre
 * sí. */
export async function downloadNodeAsPng(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(node, {
    backgroundColor: "#0D0710",
    pixelRatio: 2,
    filter: exportFilter,
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
