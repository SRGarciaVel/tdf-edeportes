const AVATAR_COLORS = [
  "bg-tdf-magenta",
  "bg-tdf-purple",
  "bg-emerald-700",
  "bg-amber-700",
  "bg-sky-700",
];

function avatarColor(seed: string): string {
  const sum = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/** Círculo de color determinístico (mismo texto -> mismo color siempre) con
 * las iniciales del nombre. No depende de ningún arte de terceros — evita
 * por completo el problema de derechos de imagen de personajes de SF6. */
export default function InitialsAvatar({ seed, size = 12 }: { seed: string; size?: number }) {
  return (
    <div
      className={`${avatarColor(seed)} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.3 }}
    >
      {seed.slice(0, 2).toUpperCase()}
    </div>
  );
}
