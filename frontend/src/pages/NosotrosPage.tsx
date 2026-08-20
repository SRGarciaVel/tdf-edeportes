import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";

const STAFF = [
  { name: "BazthyFreeman", role: "CEO" },
  { name: "Chubi", role: "Artista" },
  { name: "Sirxtias", role: "Caster y Programación" },
  { name: "Drachen", role: "Contenido Multimedia" },
  { name: "Zacen", role: "Gestión de Recursos y TO" },
  { name: "AckermanFG", role: "Programador" },
];

export default function NosotrosPage() {
  return (
    <Layout>
      <SectionLabel index="07">Quiénes somos</SectionLabel>

      <div className="flex flex-col items-center text-center mb-12">
        <img
          src="/brand/logo-full.webp"
          alt="TDF"
          className="w-48 sm:w-56 h-auto mb-4"
        />
        <p className="text-tdf-muted max-w-lg leading-relaxed font-body">
          Equipo profesional de los edeportes, preparado para edeportear y crear
          contenido de altísima calidad.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-14">
        <div>
          <h2 className="font-mono text-xs uppercase text-tdf-magenta mb-3">
            ¿Quiénes somos?
          </h2>
          <p className="text-tdf-muted leading-relaxed text-sm font-body">
            Somos un equipo meme/roleplay de fighting games, compuesto por
            jóvenes como tú que quieren dar sus primeros pasos en un entorno de
            webeo sano y con respeto. Estamos asociados a diversas comunidades
            chilenas de juegos de pelea, y nuestro enfoque va principalmente a
            Street Fighter 3: Third Strike, y de ahí a la variedad de contenido,
            manteniendo siempre un ambiente sano y ligero.
          </p>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase text-tdf-magenta mb-3">
            ¿Qué hacemos?
          </h2>
          <p className="text-tdf-muted leading-relaxed text-sm font-body">
            Tenemos un amplio repertorio de actividades para asegurar una opción
            de interacción con nuestros espectadores: salas abiertas de Third
            Strike y juegos retro (Fightcade 2), exhibiciones y torneos de
            fighting games, y streams particulares de cada miembro con fighting
            games y variedad.
          </p>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase text-tdf-magenta mb-3">
            ¿Cómo aporto?
          </h2>
          <p className="text-tdf-muted leading-relaxed text-sm font-body">
            El aporte primordial que siempre puedes hacer es participar
            activamente en la comunidad, a través de los streams, las
            actividades y los torneos. Si además quieres hacer un aporte
            monetario, puedes suscribirte al canal o donar por Twitch. Todo
            aporte se usa únicamente en el crecimiento de la comunidad, tanto en
            mejorar las actividades como en conseguir recursos para streaming.
          </p>
        </div>
      </div>

      <h2 className="font-mono text-xs uppercase text-tdf-muted mb-3">Staff</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STAFF.map((s) => (
          <div key={s.name} className="hud-frame bg-tdf-charcoal px-5 py-4">
            <p className="font-semibold">{s.name}</p>
            <p className="font-mono text-xs text-tdf-magenta">{s.role}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
