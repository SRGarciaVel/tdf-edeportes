/** Bloque gris pulsante para estados de carga — mismo lenguaje visual en
 * todo el sitio (no un spinner por página, no un "Cargando..." de texto).
 * `className` controla ancho/alto/forma, ej: "h-4 w-24" o "h-10 w-10 rounded-full". */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-tdf-line ${className}`} />;
}
