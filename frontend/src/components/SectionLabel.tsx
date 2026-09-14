import { useEffect, useState } from "react";

const MS_PER_CHAR = 18;

/** Etiqueta tipo "// 01: SECCIÓN" — el texto después de los dos
 * puntos se escribe letra por letra al aparecer, como en una terminal
 * (referencia real: developer.motion.dev, "Typewriter: Change
 * Content", 13-09-2026). El "// 0N:" queda fijo — es el texto
 * variable el que se escribe, igual que un prompt de terminal
 * mostrando el número de comando ya puesto y recién tecleando el
 * comando en sí. Se usa en 20 páginas del sitio, así que este único
 * cambio mejora todo el sitio de una sola vez. */
export default function SectionLabel({
  index,
  children,
}: {
  index: string;
  children: string;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(children.slice(0, i));
      if (i >= children.length) clearInterval(interval);
    }, MS_PER_CHAR);
    return () => clearInterval(interval);
  }, [children]);

  const done = typed.length === children.length;

  return (
    <p className="hud-label mb-2">
      // {index}: {typed}
      {!done && <span className="inline-block w-[0.5em] animate-pulse">▌</span>}
    </p>
  );
}
