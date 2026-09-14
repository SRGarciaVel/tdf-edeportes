import { useEffect, useRef, useState } from "react";

const COUNT_DURATION_MS = 900;

/** Cuenta desde 0 (o desde el valor anterior, si ya había uno) hasta
 * `value` con una desaceleración al final — pedido de Seba
 * (13-09-2026): la franja de stats del hero mostraba "N/D" mientras
 * cargaba, y se sentía como una mala primera impresión. Mientras
 * `value` es `null` (todavía no llegó el dato real), se queda en 0 —
 * nunca muestra texto, siempre un número, así el layout no salta
 * cuando el dato real llega y arranca a contar. */
export default function AnimatedNumber({ value }: { value: number | null }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) return;
    const from = prevValue.current ?? 0;
    const to = value;
    prevValue.current = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    let frameId: number;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / COUNT_DURATION_MS, 1);
      // easeOutCubic — desacelera al final, se siente más natural que
      // una cuenta lineal pareja
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{display}</>;
}
