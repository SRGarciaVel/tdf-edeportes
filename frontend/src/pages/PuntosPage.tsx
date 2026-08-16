import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
}

// PLACEHOLDER — no hay mecánica real de puntos todavía. Falta definir con
// el CEO y el staff cómo se acumulan (bot/extensión propia, conectada a
// Twitch) y para qué se canjean (SPECS.md #12/§ pendiente de numerar,
// sección de rewards). Esto es solo el molde visual.
const PLACEHOLDER_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: "ShimonDopef", points: 128430 },
  { rank: 2, username: "fabix531", points: 96220 },
  { rank: 3, username: "reina_rata", points: 84150 },
  { rank: 4, username: "m__fgc", points: 71800 },
  { rank: 5, username: "Rookiepower", points: 65900 },
  { rank: 6, username: "AgxxsFGC", points: 58120 },
  { rank: 7, username: "toki55_", points: 51400 },
  { rank: 8, username: "ddyzgg", points: 47630 },
  { rank: 9, username: "RCHerMan", points: 42980 },
  { rank: 10, username: "donjavierlive", points: 39500 },
];

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const isFirst = place === 1;
  return (
    <div
      className={`hud-frame bg-tdf-charcoal px-6 py-6 flex flex-col items-center gap-3 ${
        isFirst ? "sm:-translate-y-4" : ""
      }`}
    >
      <span className="font-mono text-xs text-gray-500">#{place}</span>
      <InitialsAvatar seed={entry.username} size={isFirst ? 16 : 12} />
      <p className="font-semibold text-center">{entry.username}</p>
      <p className="font-mono text-tdf-magenta font-bold text-lg">
        {entry.points.toLocaleString("es-CL")}
      </p>
      <p className="font-mono text-[10px] uppercase text-gray-600">Puntos</p>
    </div>
  );
}

export default function PuntosPage() {
  const [first, second, third] = PLACEHOLDER_LEADERBOARD;
  const rest = PLACEHOLDER_LEADERBOARD.slice(3);

  return (
    <Layout>
      <SectionLabel index="08">Ranking de la comunidad</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Puntos</h1>
      <p className="text-gray-500 mb-2 max-w-xl">
        Los espectadores más activos del chat y el stream.
      </p>
      <p className="font-mono text-xs text-amber-500/80 mb-10 border border-amber-500/30 inline-block px-2 py-1">
        Datos de ejemplo, el sistema de puntos real todavía no está
        implementado.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-12 items-end">
        <PodiumCard entry={second} place={2} />
        <PodiumCard entry={first} place={1} />
        <PodiumCard entry={third} place={3} />
      </div>

      <div className="hud-frame bg-tdf-charcoal overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tdf-line font-mono text-xs uppercase text-gray-500">
              <th className="text-left px-4 py-3">Rank</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-right px-4 py-3">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((entry) => (
              <tr key={entry.username} className="border-b border-tdf-line/60 last:border-0">
                <td className="px-4 py-3 font-mono text-gray-500">{entry.rank}</td>
                <td className="px-4 py-3 flex items-center gap-3">
                  <InitialsAvatar seed={entry.username} size={7} />
                  {entry.username}
                </td>
                <td className="px-4 py-3 text-right font-mono text-tdf-magenta">
                  {entry.points.toLocaleString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
