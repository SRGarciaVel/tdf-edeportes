// animación de entrada escalonada, compartida entre el navbar de
// escritorio y los paneles mobile — referencia: developer.motion.dev,
// ejemplo real "Sheet Modal"/"Mega Menu" ("animaciones de contenido
// escalonadas"), 13-09-2026. Antes vivía definida solo en
// MobileTabBar.tsx; para no duplicar la misma constante dos veces
// (ya nos pasó con SCROLL_COMPACT_THRESHOLD esta misma noche), queda
// acá como única fuente.
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};
