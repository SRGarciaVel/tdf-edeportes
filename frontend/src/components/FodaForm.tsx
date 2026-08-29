import { useEffect, useRef, useState } from "react";
import { FODA_QUADRANTS } from "../lib/fodaQuadrants";
import { useAuth } from "../lib/auth";

const SUGGESTED_SUBJECTS = ["Pochoclo23", "Younghou", "Kane Blueriver"];

/** Textarea que crece con el contenido en vez de scrollear adentro de
 * una caja chica — pedido explícito de Seba (29-08-2026): "sin límites
 * de caracteres porque se deben explayar", una caja que obliga a
 * scrollear para releer lo que uno mismo escribió va en contra de
 * eso. */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={`w-full bg-tdf-dark border focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body resize-none overflow-hidden ${className}`}
    />
  );
}

/** Formulario para mandar un nuevo FODA — libre para cualquiera, sin
 * necesidad de cuenta (ver POST /foda), mismo criterio que ranquear
 * una tier list ya existente. Si está logueado, el nombre se resuelve
 * solo del lado del backend; si no, pide un nombre a mano (mismo
 * patrón que el "creador" de una tier list guardada por invitado). */
export default function FodaForm({
  onSubmit,
}: {
  onSubmit: (entry: {
    subjectName: string;
    authorName?: string;
    isPublic: boolean;
    fortalezas: string;
    oportunidades: string;
    debilidades: string;
    amenazas: string;
  }) => Promise<void>;
}) {
  const { user } = useAuth();
  const [subjectName, setSubjectName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({
    fortalezas: "",
    oportunidades: "",
    debilidades: "",
    amenazas: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  const canSubmit =
    subjectName.trim().length > 0 &&
    FODA_QUADRANTS.every((q) => values[q.key].trim().length > 0) &&
    (user || authorName.trim().length > 0);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        subjectName: subjectName.trim(),
        authorName: user ? undefined : authorName.trim(),
        isPublic,
        fortalezas: values.fortalezas.trim(),
        oportunidades: values.oportunidades.trim(),
        debilidades: values.debilidades.trim(),
        amenazas: values.amenazas.trim(),
      });
      setSubjectName("");
      setAuthorName("");
      setIsPublic(true);
      setValues({
        fortalezas: "",
        oportunidades: "",
        debilidades: "",
        amenazas: "",
      });
    } catch {
      setError("No se pudo publicar. Prueba de nuevo en un momento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hud-frame bg-tdf-charcoal p-5 flex flex-col gap-4">
      <div>
        <label className="font-mono text-[10px] uppercase text-tdf-muted mb-1.5 block">
          ¿Sobre quién es este FODA?
        </label>
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="Nombre del jugador"
          className="w-full bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUGGESTED_SUBJECTS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSubjectName(name)}
              className="font-mono text-[10px] px-2 py-1 bg-tdf-dark border border-tdf-line hover:border-tdf-magenta text-tdf-muted hover:text-white transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {!user && (
        <div>
          <label className="font-mono text-[10px] uppercase text-tdf-muted mb-1.5 block">
            Tu nombre
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value.slice(0, 40))}
            placeholder="Así vas a aparecer"
            className="w-full max-w-xs bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body"
          />
        </div>
      )}
      {user && (
        <p className="font-mono text-[10px] text-tdf-muted">
          Vas a aparecer como{" "}
          <span className="text-white">{user.display_name}</span>.
        </p>
      )}

      <div>
        <label className="font-mono text-[10px] uppercase text-tdf-muted mb-1.5 block">
          Visibilidad
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`font-body text-xs px-3 py-1.5 border transition-colors ${
              isPublic
                ? "bg-tdf-magenta border-tdf-magenta text-white"
                : "bg-tdf-dark border-tdf-line text-tdf-muted hover:text-white"
            }`}
          >
            Público
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`font-body text-xs px-3 py-1.5 border transition-colors ${
              !isPublic
                ? "bg-tdf-magenta border-tdf-magenta text-white"
                : "bg-tdf-dark border-tdf-line text-tdf-muted hover:text-white"
            }`}
          >
            Privado
          </button>
        </div>
        {!isPublic && (
          <p className="font-mono text-[10px] text-tdf-muted mt-1.5 max-w-md">
            No va a aparecer en el listado de nadie más.{" "}
            {user
              ? "Lo vas a poder ver de nuevo entrando a esta página con tu cuenta."
              : "Como no tienes cuenta, la imagen que descargues al mandarlo va a ser la única copia que te quede."}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FODA_QUADRANTS.map((q) => {
          const Icon = q.Icon;
          return (
            <div key={q.key} className="flex flex-col gap-1.5">
              <label
                className={`flex items-center gap-1.5 font-mono text-[10px] uppercase ${q.iconColor}`}
              >
                <Icon size={13} /> {q.label}
              </label>
              <AutoTextarea
                value={values[q.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [q.key]: v }))}
                placeholder={q.placeholder}
                className={q.border}
              />
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-xs font-body">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="self-start font-body text-sm px-5 py-2 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
      >
        {submitting ? "Publicando..." : "Publicar FODA"}
      </button>
    </div>
  );
}
