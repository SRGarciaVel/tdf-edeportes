// misma navbar reactiva al scroll de Navbar.tsx — este número tiene
// que calzar exacto con el que usa ese componente para animar la
// cápsula. Antes vivía duplicado a mano en dos archivos (Navbar.tsx
// y, a ojo, en TwitchChatPanel.tsx) — bug real encontrado por Seba,
// 13-09-2026. TwitchChatPanel ya no necesita saber el alto de la
// navbar (decisión de diseño del mismo día: el chat ocupa el 100%
// del alto siempre, la navbar flota encima en vez de dejarle un
// hueco), pero el umbral en sí sigue siendo una sola fuente de
// verdad por si algo más lo termina necesitando.
export const SCROLL_COMPACT_THRESHOLD = 40;
