import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";

const STAFF = [
  { name: "BF", role: "CEO" },
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
      <h1 className="text-3xl font-bold mb-6">Nosotros</h1>

      <p className="text-gray-400 max-w-2xl mb-10 leading-relaxed">
        TDF e-deportes es, antes que nada, una <strong className="text-white">comunidad</strong>.
        Streameamos fighting games, jugando Third Strike, Street Fighter 6 y
        cualquier otro FG que se cruce, para que la gente se sume, mire,
        comente y forme parte. Organizamos torneos abiertos a toda la
        comunidad, pero eso es un evento más de lo que hacemos, no el centro
        de por qué existimos.
      </p>

      <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">Staff</h2>
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
