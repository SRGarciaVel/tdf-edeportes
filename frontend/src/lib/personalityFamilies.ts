/** Nombres legibles de las 5 familias + 2 subfamilias del test de
 * personalidad SF — compartido entre PersonalityTestSfPage (muestra
 * la familia del resultado) y PersonalityRankingPage (la muestra como
 * subtítulo de cada fila, pedido de Seba 15-09-2026: "dale más
 * personalidad, se ve muy aburrido"). Las claves calzan exacto con
 * las que devuelve el backend (family_key). */
export const FAMILY_LABELS: Record<string, string> = {
  disciplinados: "Los Disciplinados en Paz",
  atormentados: "Los Atormentados",
  protectores: "Los Protectores Modernos",
  ambiciosos: "Los Ambiciosos Calculadores",
  libres_cercanos: "Los Libres: Los Cercanos",
  libres_solitarios: "Los Libres: Los Solitarios",
};

export const FAMILY_DESCRIPTIONS: Record<string, string> = {
  disciplinados:
    "Ya hiciste las paces con tu pasado. Tu fuerza viene de la calma, no de la furia.",
  atormentados:
    "Cargas con algo que todavía no resolviste del todo, y eso te empuja a seguir peleando.",
  protectores:
    "No peleas solo por ti. Tu gente es la razón real detrás de cada decisión.",
  ambiciosos:
    "El poder y el control pesan más que cualquier otra cosa en tu forma de ver el mundo.",
  libres_cercanos:
    "Vives a tu manera, sin mucha jerarquía, pero siempre con tu gente cerca.",
  libres_solitarios:
    "Vives a tu manera, sin mucha jerarquía, y prefieres manejarte por tu cuenta.",
};
