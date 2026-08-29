import { ExternalLink } from "lucide-react";
import { SOCIAL_PLATFORMS } from "../lib/socialPlatforms";
import type { SocialLink } from "../lib/types";

/** Fila compacta de íconos de redes — cada uno es un link real
 * (target=_blank), con una flechita diagonal que aparece al pasar el
 * mouse (referencia: cómo se ve Facebook en el "About" de Twitch que
 * mandó Seba, 29-08-2026) y el nombre de la red como tooltip nativo
 * (title). Va pegada al nombre en el banner, no en una columna aparte
 * — con la página ya en dos columnas, una tercera se sentía apretada. */
export default function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {links.map((link, i) => {
        const config = SOCIAL_PLATFORMS[link.platform];
        const Icon = config.Icon;
        const label = link.platform === "other" ? link.label : config.label;
        return (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title={label}
            className="group relative w-7 h-7 rounded-full bg-tdf-dark border border-tdf-line hover:border-tdf-magenta flex items-center justify-center text-tdf-muted hover:text-white transition-colors"
          >
            <Icon size={13} />
            <ExternalLink
              size={9}
              className="absolute -top-1 -right-1 bg-tdf-charcoal rounded-full text-tdf-magenta opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </a>
        );
      })}
    </div>
  );
}
