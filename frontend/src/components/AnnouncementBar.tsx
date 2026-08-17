import { useState } from "react";
import { Link } from "react-router-dom";

interface AnnouncementBarProps {
  /** Clave única para recordar que este aviso puntual ya se cerró. Cada
   * anuncio nuevo debe usar una storageKey distinta — así, al lanzar una
   * función nueva más adelante, ese aviso se muestra de nuevo aunque el
   * de "tier list" ya lo hayan cerrado hace tiempo. */
  storageKey: string;
  eyebrow: string;
  message: string;
  ctaLabel: string;
  ctaTo: string;
}

const STORAGE_PREFIX = "tdf_announcement_dismissed:";

/** Aviso tipo "alerta de sistema" del HUD, no un banner de marketing —
 * LED parpadeante + texto monoespaciado, mismo lenguaje visual que el
 * resto del sitio. Se cierra con la X y no vuelve a aparecer en ese
 * navegador (localStorage), pero cada aviso nuevo (storageKey distinta)
 * empieza fresco. */
export default function AnnouncementBar({
  storageKey,
  eyebrow,
  message,
  ctaLabel,
  ctaTo,
}: AnnouncementBarProps) {
  const fullKey = `${STORAGE_PREFIX}${storageKey}`;
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(fullKey) === "1",
  );

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(fullKey, "1");
    setDismissed(true);
  }

  return (
    <div className="hud-frame announcement-pulse bg-tdf-charcoal px-4 py-3 mb-8 flex flex-wrap items-center gap-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tdf-magenta opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tdf-magenta" />
      </span>
      <p className="hud-label !mb-0 shrink-0">// {eyebrow}</p>
      <p className="text-sm text-gray-300 flex-1 min-w-[160px]">{message}</p>
      <Link
        to={ctaTo}
        className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline whitespace-nowrap"
      >
        {ctaLabel} →
      </Link>
      <button
        onClick={handleDismiss}
        className="text-gray-500 hover:text-white text-sm shrink-0"
        aria-label="Cerrar aviso"
      >
        ✕
      </button>
    </div>
  );
}
