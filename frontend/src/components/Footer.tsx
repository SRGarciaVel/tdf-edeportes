import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import CommunityLinks from "./CommunityLinks";

/** El footer se desvanece de transparente a opaco a medida que el
 * scroll lo va revelando — referencia real: developer.motion.dev,
 * "Footer reveal" ("useScroll" + "useTransform"), 13-09-2026. Antes
 * aparecía de golpe con el resto de la página, sin ninguna
 * transición propia. `target: footerRef` con offset ["start end",
 * "start 75%"] arranca el desvanecido justo cuando el footer empieza
 * a asomar por abajo de la pantalla, y termina bien antes de que
 * llegue al centro — así ya está completamente visible cuando el
 * usuario realmente llega a leerlo, no se queda a medio desvanecer
 * en el punto donde se detiene la lectura. */
export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "start 75%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.footer
      ref={footerRef}
      style={{ opacity }}
      className="border-t border-tdf-line mt-16"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img
            src="/brand/logo-wordmark.webp"
            alt="TDF"
            className="h-5 w-auto opacity-70"
          />
          <p className="font-mono text-xs text-tdf-muted">
            e-deportes © {new Date().getFullYear()} · Comunidad de Fighting
            Games
          </p>
        </div>
        <CommunityLinks />
      </div>
    </motion.footer>
  );
}
