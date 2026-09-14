import { useEffect, useState } from "react";

// misma navbar reactiva al scroll de Navbar.tsx — estos 3 números
// tienen que calzar exacto con los que usa ese componente para
// animar la cápsula. Antes vivían duplicados a mano en dos archivos
// (Navbar.tsx y, adivinados a ojo, en TwitchChatPanel.tsx) — bug real
// encontrado por Seba, 13-09-2026: el chat quedaba descuadrado contra
// la navbar porque el número que usaba para "saltarse" el alto de la
// navbar nunca se actualizaba cuando la navbar cambiaba de tamaño al
// scrollear. Ahora es una sola fuente, y el chat mide la altura real
// en vivo en vez de adivinar un pixel fijo.
export const SCROLL_COMPACT_THRESHOLD = 40;
const NAVBAR_HEIGHT_FULL = 64; // sin scroll
const NAVBAR_HEIGHT_COMPACT = 56 + 12; // alto de la cápsula + su margin-top

/** Alto real (en px) de la navbar de escritorio en este momento —
 * 0 en mobile, donde no hay navbar arriba (la navegación vive en la
 * tab bar de abajo, ver MobileTabBar.tsx). Cualquier elemento fixed
 * que necesite "empezar debajo de la navbar" debería usar esto en
 * vez de adivinar un número fijo. */
export function useNavbarHeight(): number {
  const [height, setHeight] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? NAVBAR_HEIGHT_FULL : 0,
  );

  useEffect(() => {
    const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

    function update() {
      if (!isDesktop()) {
        setHeight(0);
        return;
      }
      setHeight(
        window.scrollY > SCROLL_COMPACT_THRESHOLD
          ? NAVBAR_HEIGHT_COMPACT
          : NAVBAR_HEIGHT_FULL,
      );
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return height;
}
