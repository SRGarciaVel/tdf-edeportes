import { Radio } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import InitialsAvatar from "../components/InitialsAvatar";
import InstagramEmbed from "../components/InstagramEmbed";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import TwitchEmbed from "../components/TwitchEmbed";
import {
  getRecentComments,
  listCfnPlayers,
  listEvents,
  listHighlights,
} from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import { useCachedData } from "../lib/useCachedData";
import { useFriendsLiveStatus } from "../lib/useFriendsLiveStatus";
import { useTwitchLiveStatus } from "../lib/useTwitchLiveStatus";

// cuántas caras mostrar en el vistazo de comunidad — más que esto en
// una fila empieza a sentirse apretado en mobile (2 columnas)
const COMMUNITY_PREVIEW_COUNT = 6;
// mismo criterio que COMMUNITY_PREVIEW_COUNT — el vistazo del Home
// muestra pocas, la página completa (/recopilaciones) las tiene todas
const HIGHLIGHTS_PREVIEW_COUNT = 2;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function HomePage() {
  const liveStatus = useTwitchLiveStatus();
  const friendsLive = useFriendsLiveStatus();

  const { data: eventsData, loading: loadingEvent } = useCachedData(
    "events-public",
    () => listEvents(null),
  );
  const nextEvent = useMemo(() => {
    const upcoming = (eventsData ?? [])
      .filter((e) => new Date(e.start_at) > new Date())
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
    return upcoming[0] ?? null;
  }, [eventsData]);

  // mismo key "cfn-players" que usa /jugadores — visitar cualquiera de
  // las dos páginas calienta el caché para la otra también, gratis
  const { data: playersData, loading: loadingPlayers } = useCachedData(
    "cfn-players",
    listCfnPlayers,
  );
  const communityPreview = useMemo(() => {
    // los mejores rankeados primero (MR más alto arriba) — sin MR (sin
    // partidas registradas todavía) van al final, no antes que alguien
    // con rango real
    const sorted = [...(playersData ?? [])].sort((a, b) => {
      if (a.master_rating == null && b.master_rating == null) return 0;
      if (a.master_rating == null) return 1;
      if (b.master_rating == null) return -1;
      return b.master_rating - a.master_rating;
    });
    return sorted.slice(0, COMMUNITY_PREVIEW_COUNT);
  }, [playersData]);

  const { data: recentCommentsData, loading: loadingComments } = useCachedData(
    "recent-comments",
    getRecentComments,
  );
  const recentComments = recentCommentsData ?? [];

  const { data: highlightsData, loading: loadingHighlights } = useCachedData(
    "instagram-highlights",
    listHighlights,
  );
  const highlights = highlightsData ?? [];

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
                real del contenedor.

                Centrado en top:32%, no en el medio del archivo (50%):
                el archivo completo es mascota + wordmark "TDF" abajo,
                y centrar en el archivo entero deja el resplandor a
                mitad de camino entre los dos, no sobre la mascota en
                sí (se veía corrido hacia arriba/derecha respecto al
                personaje, encontrado por Seba, 21-08-2026). La mascota
                ocupa el ~55-60% de arriba del archivo, así que su
                centro real cae cerca del 30% del alto total. */}
            <div className="relative shrink-0 mx-auto lg:mx-0">
              <div
                className="absolute w-[140%] h-[140%] pointer-events-none -z-10"
                style={{
                  left: "50%",
                  top: "32%",
                  transform: "translate(-50%, -50%)",
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
        {liveStatus === null ? (
          <div className="hud-frame bg-tdf-charcoal py-10 flex items-center justify-center">
            <Skeleton className="h-6 w-40" />
          </div>
        ) : liveStatus.is_live ? (
          <TwitchEmbed />
        ) : (
          // reemplaza la tarjeta blanca que mete el propio iframe de
          // Twitch cuando el canal está offline — no se puede estilizar
          // (es contenido de otro dominio), así que directamente no se
          // muestra el embed hasta confirmar que está en vivo de
          // verdad (bug real reportado por Seba, 21-08-2026). Sin
          // aspect-video acá a propósito: ese alto (16:9 del ancho
          // completo) tiene sentido para el reproductor real, pero
          // deja una caja enorme y vacía para dos líneas de texto
          // cuando está offline, que es el estado más común (otro
          // hallazgo real de Seba, mismo día).
          <div className="hud-frame bg-tdf-charcoal py-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Radio size={24} className="text-tdf-muted" />
            <p className="font-display font-bold uppercase text-base">
              Ahora no está en vivo
            </p>
            <p className="font-body text-sm text-tdf-muted max-w-sm">
              Sigue el canal para enterarte apenas empecemos.
            </p>
          </div>
        )}
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

      {/* Younghou y Pochoclo23 — el mayor apoyo de la escena chilena
          para el club, destacados acá cuando están en vivo (pedido de
          Seba, 29-08-2026). Si los dos están en vivo a la vez, se
          muestran los DOS lado a lado en vez de forzar elegir uno —
          es justamente una devolución de mano, no tendría sentido
          bajarle el perfil a cualquiera de los dos. */}
      {friendsLive.some((f) => f.is_live) && (
        <section className="mb-12">
          <SectionLabel index="03">Amigos en vivo</SectionLabel>
          <div
            className={`grid gap-4 ${friendsLive.filter((f) => f.is_live).length > 1 ? "sm:grid-cols-2" : ""}`}
          >
            {friendsLive
              .filter((f) => f.is_live)
              .map((f) => (
                <div key={f.channel} className="flex flex-col gap-2">
                  <TwitchEmbed
                    channel={f.channel}
                    title={`${f.channel} en vivo`}
                  />
                  <p className="font-mono text-xs text-tdf-muted">
                    <a
                      href={`https://www.twitch.tv/${f.channel}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-tdf-magenta hover:text-white underline"
                    >
                      twitch.tv/{f.channel}
                    </a>
                    {f.title && <span>. {f.title}</span>}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {loadingEvent && (
        <section className="hud-frame bg-tdf-charcoal px-6 py-5 mb-12 flex flex-col gap-3">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-40" />
        </section>
      )}

      {!loadingEvent && nextEvent && (
        <section className="hud-frame bg-tdf-charcoal px-6 py-5 mb-12">
          <SectionLabel index="04">Próximo evento</SectionLabel>
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

      <section className="mb-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <SectionLabel index="05">La comunidad</SectionLabel>
          <Link
            to="/jugadores"
            className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline"
          >
            Ver a todos →
          </Link>
        </div>
        {loadingPlayers && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}
        {!loadingPlayers && communityPreview.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {communityPreview.map((p) => (
              <Link
                key={p.cfn_id}
                to={`/jugadores/${p.cfn_id}`}
                className="relative hud-frame bg-tdf-charcoal px-3 py-3 flex flex-col items-center gap-2 text-center hover:border-tdf-magenta transition-colors"
              >
                {p.comment_count > 0 && (
                  <span className="absolute top-1.5 right-1.5 font-mono text-[9px] bg-tdf-dark border border-tdf-line text-tdf-muted px-1.5 py-0.5 rounded-full">
                    💬 {p.comment_count}
                  </span>
                )}
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.display_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar seed={p.display_name} size={10} />
                )}
                <div className="min-w-0">
                  <p className="font-body text-xs font-semibold truncate">
                    {p.display_name}
                  </p>
                  {p.character_name && (
                    <p
                      className={`font-mono text-[10px] truncate ${characterColorClass(p.character_name)}`}
                    >
                      {p.character_name}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <SectionLabel index="06">Recopilaciones</SectionLabel>
          <Link
            to="/recopilaciones"
            className="font-mono text-xs uppercase text-tdf-magenta hover:text-white underline"
          >
            Ver todas →
          </Link>
        </div>
        {loadingHighlights && (
          <div className="grid sm:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        )}
        {!loadingHighlights && highlights.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-6">
            {highlights.slice(0, HIGHLIGHTS_PREVIEW_COUNT).map((h) => (
              <InstagramEmbed key={h.id} url={h.url} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <SectionLabel index="07">Actividad reciente</SectionLabel>
        {loadingComments && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!loadingComments && recentComments.length === 0 && (
          <p className="font-mono text-xs text-tdf-muted">
            Todavía no hay comentarios en ningún perfil. Sé el primero en dejar
            uno.
          </p>
        )}
        {!loadingComments && recentComments.length > 0 && (
          <div className="hud-frame bg-tdf-charcoal divide-y divide-tdf-line">
            {recentComments.map((c) => (
              <Link
                key={c.id}
                to={`/jugadores/${c.profile_cfn_id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-tdf-dark/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-tdf-dark">
                  {c.author.avatar_url ? (
                    <img
                      src={c.author.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar seed={c.author.display_name} size={8} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">
                      {c.author.display_name}
                    </span>{" "}
                    <span className="text-tdf-muted">
                      comentó en el perfil de
                    </span>{" "}
                    <span className="font-semibold text-tdf-magenta">
                      {c.profile_display_name}
                    </span>
                  </p>
                  <p className="font-body text-xs text-tdf-muted truncate">
                    "{c.body}"
                  </p>
                </div>
                <p className="font-mono text-[10px] text-tdf-muted shrink-0 mt-1">
                  {relativeTime(c.created_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

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
