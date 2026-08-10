import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { listEvents } from "../lib/api";
import type { EventItem } from "../lib/types";

export default function HomePage() {
  const [nextEvent, setNextEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    listEvents(null).then((events) => {
      const upcoming = events
        .filter((e) => new Date(e.start_at) > new Date())
        .sort((a, b) => a.start_at.localeCompare(b.start_at));
      setNextEvent(upcoming[0] ?? null);
    });
  }, []);

  return (
    <Layout>
      <section className="py-12 flex flex-col gap-6">
        <SectionLabel index="01">Comunidad de fighting games</SectionLabel>
        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-none">
          TDF <span className="text-tdf-magenta">e-deportes</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl">
          Streams, torneos y una comunidad que crece jugando Street Fighter 6,
          Third Strike, Alpha 2 y lo que se cruce. Somos comunidad primero —
          los torneos son un evento más, no el centro.
        </p>
        <div className="flex flex-wrap gap-4 font-mono text-sm uppercase">
          <a
            href="https://www.twitch.tv/tdfedeportes"
            target="_blank"
            rel="noreferrer"
            className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-5 py-3 text-white"
          >
            Ver stream en Twitch →
          </a>
          <Link
            to="/calendario"
            className="border border-tdf-line hover:border-tdf-magenta transition-colors px-5 py-3"
          >
            Ver calendario
          </Link>
        </div>
      </section>

      {nextEvent && (
        <section className="hud-frame bg-tdf-charcoal px-6 py-5 mb-12">
          <SectionLabel index="02">Próximo evento</SectionLabel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xl font-semibold">{nextEvent.title}</p>
              <p className="font-mono text-xs text-gray-500 mt-1">
                {new Date(nextEvent.start_at).toLocaleString("es-CL", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <Link
              to="/calendario"
              className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline"
            >
              Ver en el calendario →
            </Link>
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-3 gap-4">
        {[
          { to: "/torneos", label: "Torneos", desc: "Brackets y resultados vía start.gg" },
          { to: "/jugadores", label: "Jugadores", desc: "CFN de TDF y la escena chilena" },
          { to: "/nosotros", label: "Nosotros", desc: "Quiénes somos y el staff detrás" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="hud-frame bg-tdf-charcoal px-5 py-6 hover:border-tdf-magenta transition-colors"
          >
            <p className="text-lg font-semibold text-tdf-magenta mb-1">{item.label}</p>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </section>
    </Layout>
  );
}
