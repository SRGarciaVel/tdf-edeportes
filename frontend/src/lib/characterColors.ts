// Colores asociados a cada personaje de SF6 y Third Strike — elección de
// estilo propia (no arte ni logos de Capcom, solo un color de texto
// inspirado en la vibra de cada uno) para darle identidad visual cuando
// se menciona un personaje en la página, en vez de un solo color plano
// para todos. Los personajes que existen en los dos juegos (Ryu, Ken,
// Chun-Li, Elena, Akuma, Alex) usan el mismo color en ambos.
const CHARACTER_COLORS: Record<string, string> = {
  "a.k.i.": "text-fuchsia-400",
  akuma: "text-red-500",
  alex: "text-blue-400",
  blanka: "text-lime-400",
  "c. viper": "text-red-400",
  cammy: "text-emerald-400",
  "chun-li": "text-blue-400",
  "dee jay": "text-yellow-400",
  dhalsim: "text-orange-400",
  ed: "text-purple-400",
  "e. honda": "text-sky-400",
  elena: "text-teal-400",
  guile: "text-green-500",
  ingrid: "text-amber-400",
  jamie: "text-amber-500",
  jp: "text-violet-500",
  juri: "text-fuchsia-500",
  ken: "text-red-500",
  kimberly: "text-yellow-400",
  lily: "text-amber-600",
  luke: "text-orange-500",
  "m. bison": "text-purple-500",
  mai: "text-red-400",
  manon: "text-pink-400",
  marisa: "text-stone-300",
  rashid: "text-yellow-400",
  ryu: "text-red-400",
  sagat: "text-orange-600",
  terry: "text-red-500",
  yasmine: "text-fuchsia-400",
  zangief: "text-red-600",
  // exclusivos de Third Strike
  dudley: "text-violet-400",
  gill: "text-rose-400",
  hugo: "text-blue-700",
  ibuki: "text-teal-500",
  makoto: "text-amber-700",
  necro: "text-emerald-500",
  oro: "text-amber-600",
  q: "text-gray-400",
  remy: "text-sky-500",
  sean: "text-orange-400",
  twelve: "text-cyan-300",
  urien: "text-purple-600",
  yang: "text-blue-400",
  yun: "text-yellow-500",
};

const DEFAULT_COLOR = "text-tdf-purple";

/** Color de texto para un personaje de SF6/Third Strike — case-insensitive,
 * con un color por defecto para nombres que no estén en el mapa (nuevos
 * personajes que Capcom agregue, o texto que no sea un nombre real). */
export function characterColorClass(name: string | null | undefined): string {
  if (!name) return DEFAULT_COLOR;
  return CHARACTER_COLORS[name.toLowerCase()] ?? DEFAULT_COLOR;
}

// Rosters para la tier list (SPECS.md — sección de tier lists). Nombres
// tal cual los usa Capcom, mismo casing que se ve en el selector de
// personaje del juego real.
export const SF6_ROSTER = [
  "A.K.I.", "Akuma", "Alex", "Blanka", "C. Viper", "Cammy", "Chun-Li",
  "Dee Jay", "Dhalsim", "Ed", "E. Honda", "Elena", "Guile", "Ingrid",
  "Jamie", "JP", "Juri", "Ken", "Kimberly", "Lily", "Luke", "M. Bison",
  "Mai", "Manon", "Marisa", "Rashid", "Ryu", "Sagat", "Terry", "Yasmine",
  "Zangief",
];

export const THIRD_STRIKE_ROSTER = [
  "Alex", "Chun-Li", "Dudley", "Elena", "Gill", "Hugo", "Ibuki", "Ken",
  "Makoto", "Necro", "Oro", "Q", "Remy", "Ryu", "Sean", "Twelve", "Urien",
  "Yang", "Yun", "Akuma",
];
