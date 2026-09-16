/** Retratos de selección de personaje para el test de personalidad SF
 * — arte oficial estilo "select screen", fondo neutro (pedido de
 * Seba, 14-09-2026, confirmado viable por fair use tras consultarlo
 * aparte). Arranca con los 20 personajes del prototipo original; el
 * resto del roster (82 en total) no tiene imagen todavía y usa el
 * resultado sin foto — nunca se rompe por faltar una.
 *
 * Los archivos van en /public/characters/, así que la ruta es
 * relativa a la raíz del sitio, no a este archivo. Cuando se agregue
 * la imagen de un personaje nuevo, solo hace falta sumar una línea
 * acá — el resto del sitio ya sabe mostrarla. */
export const CHARACTER_IMAGES: Record<string, string> = {
  "Ryu (Alpha-SF5)": "/characters/ryu-alpha-sf5.webp",
  "Ryu (SF6)": "/characters/ryu-sf6.webp",
  "Ken (Alpha-SFV)": "/characters/ken-alpha-sfv.webp",
  "Ken (SF6)": "/characters/ken-sf6.webp",
  "Chun-Li (SF2-Alpha)": "/characters/chun-li-sf2-alpha.webp",
  "Chun-Li (SF4-SF6)": "/characters/chun-li-sf4-sf6.webp",
  "Sagat (SF1-Alpha)": "/characters/sagat-sf1-alpha.webp",
  "Sagat (SF5-SF6)": "/characters/sagat-sf5-sf6.webp",
  "Karin (Alpha 3)": "/characters/karin-alpha3.webp",
  "Karin (SFV)": "/characters/karin-sfv.webp",
  Guile: "/characters/guile.webp",
  Blanka: "/characters/blanka.webp",
  Dhalsim: "/characters/dhalsim.webp",
  Zangief: "/characters/zangief.webp",
  Juri: "/characters/juri.webp",
  Jamie: "/characters/jamie.webp",
  JP: "/characters/jp.webp",
  Kimberly: "/characters/kimberly.webp",
  Manon: "/characters/manon.webp",
  "Dan Hibiki": "/characters/dan-hibiki.webp",
};

export function getCharacterImage(characterName: string): string | null {
  return CHARACTER_IMAGES[characterName] ?? null;
}
