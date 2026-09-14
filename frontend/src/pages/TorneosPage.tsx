import { Medal, Users } from "lucide-react";
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
            .sort((a, b) => b.start_at.localeCompare(a.start_at)),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const upcoming = tournaments.filter((t) => new Date(t.start_at) > new Date());
  const past = tournaments.filter((t) => new Date(t.start_at) <= new Date());

  return (
    <Layout>
      <SectionLabel index="04">Eventos organizados por el club</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Torneos</h1>
      <p className="text-tdf-muted mb-8 max-w-xl font-body">
        Todos los torneos que organiza TDF son abiertos a la comunidad. Por
        transparencia, el staff organizador no compite en los torneos que ellos
        mismos crean.
      </p>

      {loading && <TournamentListSkeleton />}

      {!loading && tournaments.length === 0 && (
        <p className="text-sm text-tdf-muted font-body">
          Todavía no hay torneos cargados.
        </p>
      )}

      {!loading && upcoming.length > 0 && (
        <div className="mb-10">
          <h2 className="font-mono text-xs uppercase text-tdf-muted mb-3">
            Próximos
          </h2>
          <TournamentList items={upcoming} />
        </div>
      )}

      {!loading && past.length > 0 && (
        <div>
          <h2 className="font-mono text-xs uppercase text-tdf-muted mb-3">
            Anteriores
          </h2>
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
        <li
          key={i}
          className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center justify-between"
        >
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
        <li
          key={t.id}
          className="hud-frame bg-tdf-charcoal px-5 py-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold">{t.title}</p>
              <div className="flex items-center gap-3 font-mono text-xs text-tdf-muted">
                <span>
                  {new Date(t.start_at).toLocaleDateString("es-CL", {
                    dateStyle: "long",
                  })}
                </span>
                {/* solo viene de la sincronización con start.gg — un
                    torneo cargado a mano se queda sin este dato,
                    nunca muestra "0 participantes" a falta de algo
                    mejor */}
                {t.attendee_count != null && (
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {t.attendee_count} participantes
                  </span>
                )}
              </div>
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
              <span className="font-mono text-xs text-tdf-muted">
                Sin bracket cargado
              </span>
            )}
          </div>

          {/* podio — mismo criterio que /logros: solo se muestra si
              hay datos reales, nunca un podio inventado o vacío */}
          {t.standings && t.standings.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-3 border-t border-tdf-line">
              {t.standings.map((s) => (
                <div
                  key={s.placement}
                  className="flex items-center gap-1.5 font-mono text-xs"
                >
                  <Medal
                    size={14}
                    className={
                      s.placement === 1
                        ? "text-amber-400"
                        : s.placement === 2
                          ? "text-slate-300"
                          : "text-orange-700"
                    }
                  />
                  <span className="text-tdf-muted">{s.placement}°</span>
                  <span className="text-white">{s.gamertag}</span>
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
