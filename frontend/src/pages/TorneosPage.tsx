import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { listEvents } from "../lib/api";
import type { EventItem } from "../lib/types";

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEvents(null)
      .then((events) =>
        setTournaments(
          events
            .filter((e) => e.type === "torneo")
            .sort((a, b) => b.start_at.localeCompare(a.start_at))
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const upcoming = tournaments.filter((t) => new Date(t.start_at) > new Date());
  const past = tournaments.filter((t) => new Date(t.start_at) <= new Date());

  return (
    <Layout>
      <SectionLabel index="04">Eventos organizados por el club</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Torneos</h1>
      <p className="text-gray-500 mb-8 max-w-xl">
        Todos los torneos que organiza TDF son abiertos a la comunidad. Por
        transparencia, el staff organizador no compite en los torneos que
        ellos mismos crean.
      </p>

      {loading && <TournamentListSkeleton />}

      {!loading && tournaments.length === 0 && (
        <p className="text-sm text-gray-600">Todavía no hay torneos cargados.</p>
      )}

      {!loading && upcoming.length > 0 && (
        <div className="mb-10">
          <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">Próximos</h2>
          <TournamentList items={upcoming} />
        </div>
      )}

      {!loading && past.length > 0 && (
        <div>
          <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">Anteriores</h2>
          <TournamentList items={past} />
        </div>
      )}
    </Layout>
  );
}

function TournamentListSkeleton() {
  return (
    <ul className="flex flex-col gap-3 mb-10">
      {[0, 1, 2].map((i) => (
        <li key={i} className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-24" />
        </li>
      ))}
    </ul>
  );
}

function TournamentList({ items }: { items: EventItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((t) => (
        <li key={t.id} className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold">{t.title}</p>
            <p className="font-mono text-xs text-gray-500">
              {new Date(t.start_at).toLocaleDateString("es-CL", { dateStyle: "long" })}
            </p>
          </div>
          {t.external_url ? (
            <a
              href={t.external_url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline"
            >
              Ver bracket en start.gg →
            </a>
          ) : (
            <span className="font-mono text-xs text-gray-600">Sin bracket cargado</span>
          )}
        </li>
      ))}
    </ul>
  );
}
