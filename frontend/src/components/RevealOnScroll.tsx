import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "left" | "right" | "up";

// recorrido largo a propósito — pedido explícito de Seba (30-08-2026):
// "marcada, tipo Capcom", no un desplazamiento sutil de 20-30px
const DISTANCE = 140;

function getVariants(direction: Direction): Variants {
  const offset =
    direction === "left"
      ? { x: -DISTANCE }
      : direction === "right"
        ? { x: DISTANCE }
        : { y: DISTANCE };
  return {
    hidden: { opacity: 0, ...offset },
    visible: { opacity: 1, x: 0, y: 0 },
  };
}

/** Entrada animada al hacer scroll (o al cargar, si el elemento ya
 * está visible desde el principio, como el hero) — cada sección entra
 * desde la "pared" más cercana a donde va a quedar: texto/imagen del
 * hero desde los costados, el resto de las secciones desde abajo.
 * Referencia: sf.esports.capcom.com/cpt/about — se toma la idea del
 * efecto, no su código ni su contenido.
 *
 * Dispara UNA sola vez por sección (`viewport={{ once: true }}`) — no
 * se repite al scrollear arriba/abajo por la misma zona, pedido
 * explícito de Seba para que no moleste.
 *
 * Reusable a propósito (recibe `direction`/`delay`/`className`) aunque
 * hoy solo se use en Home — si más adelante se aplica a otra página,
 * no hace falta reescribir esto. */
export default function RevealOnScroll({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  // accesibilidad: quien tiene "reducir movimiento" activado en su
  // sistema operativo ve el contenido directo, sin animar — no es algo
  // que se pidió explícitamente, pero omitirlo sería ignorar una
  // preferencia de accesibilidad real del navegador
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={getVariants(direction)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
