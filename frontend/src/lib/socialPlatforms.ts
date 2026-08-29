import { Link as LinkIcon } from "lucide-react";
import type { IconType } from "react-icons";
import { SiInstagram, SiTwitch, SiX, SiYoutube } from "react-icons/si";
import type { SocialLink } from "./types";

interface PlatformConfig {
  label: string;
  Icon: IconType | typeof LinkIcon;
  placeholder: string;
}

/** Config de las 4 redes predefinidas + "other" (genérico) — un solo
 * lugar para íconos/labels, usado tanto por SocialLinksRow (display)
 * como por SocialLinksEditor (edición en /perfil). Los 4 predefinidos
 * tienen label fijo (no lo pide el formulario); "other" es el único
 * caso con label libre, para links que no son de ninguna red conocida
 * (portfolio, Linktree, etc.) — mismo criterio que el panel de Twitch
 * que mandó Seba de referencia (29-08-2026). */
export const SOCIAL_PLATFORMS: Record<SocialLink["platform"], PlatformConfig> =
  {
    instagram: {
      label: "Instagram",
      Icon: SiInstagram,
      placeholder: "https://instagram.com/tu_usuario",
    },
    x: { label: "X", Icon: SiX, placeholder: "https://x.com/tu_usuario" },
    youtube: {
      label: "YouTube",
      Icon: SiYoutube,
      placeholder: "https://youtube.com/@tu_canal",
    },
    twitch: {
      label: "Twitch",
      Icon: SiTwitch,
      placeholder: "https://twitch.tv/tu_canal",
    },
    other: { label: "Otro", Icon: LinkIcon, placeholder: "https://..." },
  };

export const SOCIAL_PLATFORM_ORDER: SocialLink["platform"][] = [
  "instagram",
  "x",
  "youtube",
  "twitch",
  "other",
];
