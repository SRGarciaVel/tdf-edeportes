/** Redimensiona un archivo de imagen a un cuadrado de `size`x`size`
 * (recorte centrado tipo "cover", igual que hace TierMaker con sus
 * miniaturas) y lo devuelve como data URL WebP comprimido — así nunca se
 * manda una foto de varios MB al backend, ni se guarda una de ese tamaño
 * en la base. Corre 100% en el navegador, no toca el servidor. */
export function resizeImageFile(file: File, size = 120, quality = 0.85): Promise<string> {
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
