import Skeleton from "./Skeleton";
import type { SkillAxis } from "../lib/types";

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Punto sobre un eje del radar — ángulo empieza arriba (-90°) y avanza
 * en sentido horario, uno por cada categoría, repartidos parejo. */
function axisPoint(index: number, total: number, radiusFraction: number) {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / total);
  return {
    x: CENTER + RADIUS * radiusFraction * Math.cos(angle),
    y: CENTER + RADIUS * radiusFraction * Math.sin(angle),
  };
}

function polygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const p = axisPoint(i, values.length, Math.max(v, 0) / 100);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

/** Radar de 5 ejes con las categorías de Records — escala relativa al
 * roster (el mejor de cada categoría = 100, ver GET
 * /cfn/players/{cfn_id}/skills). Dibujado a mano en SVG en vez de
 * sumar una librería de charts nueva al proyecto solo para esto (ver
 * CODESTYLE.md: no sobre-ingenierizar) — 5 ejes fijos, no hace falta
 * generalidad de una librería completa. */
export default function SkillRadarChart({
  axes,
  loading,
}: {
  axes: SkillAxis[] | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: SIZE }}
      >
        <Skeleton className="w-52 h-52 rounded-full" />
      </div>
    );
  }

  if (!axes || axes.every((a) => a.score == null)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-10">
        <p className="font-mono text-xs text-tdf-muted">
          Todavía no hay suficientes datos de Capcom para tu radar.
        </p>
        <p className="font-mono text-[10px] text-tdf-muted opacity-70">
          Se completa solo cuando el refresh de stats encuentre tus partidas.
        </p>
      </div>
    );
  }

  const scores = axes.map((a) => a.score ?? 0);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE + 30}`}
      className="w-full max-w-[280px] mx-auto"
    >
      <defs>
        <linearGradient id="skill-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4147A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5B2A86" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* anillos guía */}
      {RINGS.map((r) => (
        <polygon
          key={r}
          points={polygonPoints(axes.map(() => r * 100))}
          fill="none"
          stroke="#2a2233"
          strokeWidth={1}
        />
      ))}

      {/* ejes */}
      {axes.map((_, i) => {
        const p = axisPoint(i, axes.length, 1);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={p.x}
            y2={p.y}
            stroke="#2a2233"
            strokeWidth={1}
          />
        );
      })}

      {/* datos reales */}
      <polygon
        points={polygonPoints(scores)}
        fill="url(#skill-fill)"
        stroke="#C4147A"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 6px rgba(196,20,122,0.5))" }}
      />
      {axes.map((axis, i) => {
        const p = axisPoint(i, axes.length, (axis.score ?? 0) / 100);
        return (
          <circle
            key={axis.key}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={axis.score == null ? "#4a4256" : "#C4147A"}
          />
        );
      })}

      {/* labels — alineación según en qué mitad del círculo caen */}
      {axes.map((axis, i) => {
        const p = axisPoint(i, axes.length, 1.2);
        const anchor =
          p.x < CENTER - 4 ? "end" : p.x > CENTER + 4 ? "start" : "middle";
        return (
          <text
            key={axis.key}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            className="fill-tdf-muted"
            style={{
              font: "9px 'JetBrains Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
