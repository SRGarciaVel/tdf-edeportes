import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import TwitchEmbed from "../components/TwitchEmbed";
import { listEvents } from "../lib/api";
import type { EventItem } from "../lib/types";

export default function HomePage() {
  const [nextEvent, setNextEvent] = useState<EventItem | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    listEvents(null)
      .then((events) => {
        const upcoming = events
          .filter((e) => new Date(e.start_at) > new Date())
          .sort((a, b) => a.start_at.localeCompare(b.start_at));
        setNextEvent(upcoming[0] ?? null);
      })
      .finally(() => setLoadingEvent(false));
  }, []);

  return (
    <Layout>
      <section className="relative spray-bg py-16">
        <div className="relative z-10 flex flex-col gap-8">
          <SectionLabel index="01">Comunidad de fighting games</SectionLabel>

          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
            <div className="flex flex-col gap-6 max-w-xl">
              <h1 className="font-display font-bold uppercase text-4xl sm:text-5xl lg:text-6xl leading-[1.02]">
                Streams, 33
                <br />y{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #C4147A, #5B2A86)",
                  }}
                >
                  malo 6
                </span>
              </h1>
              <p className="text-lg text-tdf-muted font-body">
                Salas abiertas de Third Strike y retro, torneos, streams de cada
                uno de nosotros. No importa si es tu primera vez con fighting
                games, acá se aprende a cabezazos contra la pared.
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
            </div>

            {/* resplandor real de marca detrás de la mascota — vive
                DENTRO del mismo contenedor relative que la imagen, no
                posicionado a ojo contra toda la sección (eso hacía que
                se desalineara con la mascota real, encontrado por
                Seba, 21-08-2026). Así sigue a la imagen sin importar
                el tamaño de pantalla ni cuánto texto haya al lado.

                "ellipse", no "circle" a propósito: la imagen del logo
                es más alta que ancha (700x905), y un "circle" en una
                caja no cuadrada calcula su radio hasta la esquina más
                lejana — eso lo hace más ancho que la caja, y como el
                contenedor lo recorta ahí, el degradado nunca llega a
                desvanecerse antes del corte (se veía un borde duro,
                encontrado por Seba, 21-08-2026). "ellipse" calcula cada
                eje por separado, así que sí se ajusta a la proporción
                real del contenedor. */}
            <div className="relative shrink-0 mx-auto lg:mx-0">
              <div
                className="absolute inset-0 m-auto w-[140%] h-[140%] pointer-events-none -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse, rgba(196,20,122,0.35) 0%, rgba(91,42,134,0.18) 45%, transparent 70%)",
                }}
              />
              <img
                src="/brand/logo-full.webp"
                alt="TDF e-deportes"
                className="relative z-10 w-64 sm:w-80 lg:w-96 h-auto"
                style={{
                  filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider mb-12" />

      <section className="mb-12">
        <SectionLabel index="02">En vivo</SectionLabel>
        <TwitchEmbed />
        <p className="font-mono text-xs text-tdf-muted mt-2">
          También puedes verlo directo en{" "}
          <a
            href="https://www.twitch.tv/tdfedeportes"
            target="_blank"
            rel="noreferrer"
            className="text-tdf-magenta hover:text-white underline"
          >
            twitch.tv/tdfedeportes
          </a>
        </p>
      </section>

      {loadingEvent && (
        <section className="hud-frame bg-tdf-charcoal px-6 py-5 mb-12 flex flex-col gap-3">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-40" />
        </section>
      )}

      {!loadingEvent && nextEvent && (
        <section className="hud-frame bg-tdf-charcoal px-6 py-5 mb-12">
          <SectionLabel index="03">Próximo evento</SectionLabel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xl font-semibold">{nextEvent.title}</p>
              <p className="font-mono text-xs text-tdf-muted mt-1">
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

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            to: "/torneos",
            label: "Torneos",
            desc: "Brackets y resultados vía start.gg",
          },
          {
            to: "/jugadores",
            label: "Jugadores",
            desc: "CFN de TDF y la escena chilena",
          },
          {
            to: "/tierlist",
            label: "Tier List",
            desc: "Arma tu ranking con la comunidad",
          },
          {
            to: "/nosotros",
            label: "Nosotros",
            desc: "Quiénes somos y el staff detrás",
          },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="hud-frame bg-tdf-charcoal px-5 py-6 hover:border-tdf-magenta transition-colors"
          >
            <p className="text-lg font-semibold text-tdf-magenta mb-1">
              {item.label}
            </p>
            <p className="text-sm text-tdf-muted font-body">{item.desc}</p>
          </Link>
        ))}
      </section>
    </Layout>
  );
}
