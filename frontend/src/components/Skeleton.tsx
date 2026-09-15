/** Bloque con shimmer para estados de carga — mismo lenguaje visual en
 * todo el sitio (no un spinner por página, no un "Cargando..." de texto).
 * `className` controla ancho/alto/forma, ej: "h-4 w-24" o "h-10 w-10 rounded-full".
 * Antes era un animate-pulse plano de Tailwind — ahora un brillo real
 * recorriendo el bloque (ver .skeleton-shimmer en index.css, referencia
 * real: developer.motion.dev "Skeleton Shimmer", 13-09-2026). */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />;
}
