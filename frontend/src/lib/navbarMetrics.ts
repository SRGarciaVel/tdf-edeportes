// misma navbar reactiva al scroll de Navbar.tsx — este número tiene
// que calzar exacto con el que usa ese componente para animar la
// cápsula. Antes también lo necesitaba el panel de chat de Twitch
// (para no superponerse con la navbar y romper la protección
// anti-clickjacking de Twitch), pero ese panel se sacó del sitio por
// ahora, 13-09-2026 — se reincorporará más adelante con una interfaz
// nueva. El umbral se deja acá como fuente única de verdad por si
// algo más lo termina necesitando.
export const SCROLL_COMPACT_THRESHOLD = 40;
