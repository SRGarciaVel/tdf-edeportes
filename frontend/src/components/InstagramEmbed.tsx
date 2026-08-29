import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Carga el script oficial de embeds de Instagram una sola vez, sin
 * importar cuántos <InstagramEmbed> haya en la página — llamarlo de
 * nuevo cuando ya está cargado simplemente reusa la misma promesa. */
function loadEmbedScript(): Promise<void> {
  if (window.instgrm) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/** Embed real de un post/reel de Instagram — el <blockquote> de acá
 * abajo es exactamente el markup que da el botón "Insertar" de
 * Instagram, el script oficial lo reemplaza por el post interactivo
 * de verdad (con sus likes, su video, todo). Sin token ni conexión a
 * ninguna API propia: desde el 15-06-2026 Meta dejó el embed de posts
 * públicos sin token (antes exigía App Review, ver conversación con
 * Seba, 29-08-2026) — esto corre 100% en el navegador de quien visita
 * la página, nuestro backend no le pega a Instagram para nada.
 *
 * Va envuelto en un panel oscuro (hud-frame, mismo lenguaje visual del
 * resto del sitio) — Instagram no ofrece ningún parámetro oficial de
 * tema oscuro para este embed (chequeado 29-08-2026, confirmado que
 * no existe), y un filtro CSS de inversión de color invierte también
 * la foto/video real del post, no solo el fondo blanco de la tarjeta.
 * En vez de pelear con eso, el blanco queda "enmarcado" a propósito,
 * como un cuadro dentro del panel oscuro, en vez de flotar solo contra
 * el fondo del sitio.
 *
 * Si el script no carga (bloqueadores de ads/trackers bloquean
 * embed.js seguido), el <blockquote> se degrada solo al link de
 * abajo — no queda un hueco vacío. */
export default function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    loadEmbedScript().then(() => {
      window.instgrm?.Embeds.process();
    });
  }, [url]);

  return (
    <div className="hud-frame bg-tdf-charcoal p-4 flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#000",
          border: 0,
          borderRadius: 3,
          margin: 0,
          maxWidth: 540,
          minWidth: 326,
          width: "100%",
        }}
      >
        <div style={{ padding: 16 }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#C4147A", textDecoration: "none" }}
          >
            Ver esta publicación en Instagram
          </a>
        </div>
      </blockquote>
    </div>
  );
}
