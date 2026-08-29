/** GIF animado — canvas nunca puede exportar animación (drawImage
 * solo captura el frame que esté "actual" en ese instante), así que
 * para estos hay que saltarse todo el pipeline de recorte/compresión
 * de canvas y subir el archivo casi tal cual (ver fileToDataUrl). No
 * distingue GIF animado de GIF de un solo frame — tratarlos igual es
 * más simple y un GIF estático de más no rompe nada, solo pesa un
 * poco más de lo necesario. */
export function isAnimatedGif(file: File): boolean {
  return file.type === "image/gif";
}

// tope del lado del cliente para GIFs — el backend acepta hasta
// ~5.6MB reales en base64 (MAX_ANIMATABLE_DATA_URL_LEN en
// schemas/cfn.py), este límite queda con margen debajo de eso
export const MAX_GIF_FILE_SIZE = 5 * 1024 * 1024;

/** Lee un archivo tal cual, sin pasar por canvas — a diferencia de
 * resizeImageFile, no recorta ni comprime nada, así que preserva la
 * animación de un GIF. Usar solo para GIFs (ver isAnimatedGif); para
 * el resto de formatos sigue conviniendo resizeImageFile. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** Redimensiona un archivo de imagen a un cuadrado de `size`x`size`
 * (recorte centrado tipo "cover", igual que hace TierMaker con sus
 * miniaturas) y lo devuelve como data URL WebP comprimido — así nunca se
 * manda una foto de varios MB al backend, ni se guarda una de ese tamaño
 * en la base. Corre 100% en el navegador, no toca el servidor. */
export function resizeImageFile(
  file: File,
  size = 120,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas no disponible"));
          return;
        }
        // "cover": escala para que el lado más chico llene el cuadrado,
        // y recorta el sobrante centrado — mismo criterio que usa
        // TierMaker para sus miniaturas
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/webp", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Brillo promedio de una imagen (0 = negro puro, 1 = blanco puro) —
 * luminancia perceptual estándar, sampleada en baja resolución (50x50)
 * para que sea rápido. Pensado para correr UNA vez al subir una foto de
 * fondo de card (no en cada carga de página para cada visitante) — el
 * resultado se guarda junto con la imagen y el backend lo devuelve tal
 * cual (ver card_background_brightness en CFNPlayer). Se usa para
 * atenuar más la foto cuanto más clara sea, sin cambiar nunca el color
 * del texto (conversación de diseño, 20-08-2026, probado primero en un
 * teaser HTML con este mismo algoritmo). */
export function getImageBrightness(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.onload = () => {
      const size = 50;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas no disponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      resolve(sum / (data.length / 4) / 255);
    };
    img.src = dataUrl;
  });
}
