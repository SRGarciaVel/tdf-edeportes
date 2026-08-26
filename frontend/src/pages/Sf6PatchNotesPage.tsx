import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getLatestPatchNote, listPatchNotes } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type { PatchChange, PatchNote } from "../lib/types";

/** "20260803" -> "3 de agosto de 2026" */
function formatPatchDate(patchId: string): string {
  const MESES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const match = patchId.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return patchId;
  const [, year, month, day] = match;
  const monthName = MESES[parseInt(month, 10) - 1];
  if (!monthName) return patchId;
  return `${parseInt(day, 10)} de ${monthName} de ${year}`;
}

function ChangesTable({
  changes,
  lang,
}: {
  changes: PatchChange[];
  lang: "en" | "es";
}) {
  if (changes.length === 0) {
    return (
      <p className="font-body text-sm text-tdf-muted">Sin cambios listados.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {changes.map((c, i) => {
        const category =
          lang === "es" ? (c.category_es ?? c.category) : c.category;
        const details = lang === "es" ? (c.details_es ?? c.details) : c.details;
        return (
          <div
            key={i}
            className="border-b border-tdf-line/40 last:border-b-0 pb-2 last:pb-0"
          >
            <div className="flex items-center gap-2 mb-1">
              {c.move_name && (
                <span className="font-mono text-xs text-white">
                  {c.move_name}
                </span>
              )}
              <span className="font-mono text-[10px] uppercase text-tdf-magenta">
                {category}
              </span>
            </div>
            <p className="font-body text-sm text-tdf-muted">{details}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Sf6PatchNotesPage() {
  const [patch, setPatch] = useState<PatchNote | null>(null);
  const [history, setHistory] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );
  const [lang, setLang] = useState<"en" | "es">("es");

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([getLatestPatchNote(), listPatchNotes()])
      .then(([latest, all]) => {
        setPatch(latest);
        setHistory(all);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const characters = patch?.data?.characters ?? [];

  const selected = useMemo(
    () => characters.find((c) => c.tool_name === selectedCharacter) ?? null,
    [characters, selectedCharacter],
  );

  useEffect(() => {
    if (!selectedCharacter && characters.length > 0) {
      setSelectedCharacter(characters[0].tool_name);
    }
  }, [characters, selectedCharacter]);

  function loadPatch(patchId: string) {
    const fromHistory = history.find((p) => p.patch_id === patchId);
    if (fromHistory) {
      setPatch(fromHistory);
      setSelectedCharacter(null);
    }
  }

  return (
    <Layout>
      <SectionLabel index="11">Street Fighter 6</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Notas de parche</h1>
      <p className="text-tdf-muted mb-8 max-w-xl font-body">
        Información extraída de los datos que recopila Capcom. No hay fecha fija
        de publicación, se actualiza cuando sale un parche nuevo.
      </p>

      {loading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && error && (
        <p className="text-tdf-muted font-body">
          No se pudo cargar la última nota de parche. Puede que el script de
          refresco todavía no haya corrido ni una vez — intenta de nuevo más
          tarde.
        </p>
      )}

      {!loading && !error && patch && (
        <div className="flex flex-col gap-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-display font-bold uppercase">
              {patch.title || formatPatchDate(patch.patch_id)}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 font-mono text-[11px]">
                {(["es", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1.5 border uppercase transition-colors ${
                      lang === l
                        ? "border-tdf-magenta text-tdf-magenta"
                        : "border-tdf-line text-tdf-muted hover:text-white"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {history.length > 1 && (
                <select
                  value={patch.patch_id}
                  onChange={(e) => loadPatch(e.target.value)}
                  className="bg-tdf-dark border border-tdf-line px-3 py-1.5 text-xs font-mono uppercase"
                >
                  {history.map((p) => (
                    <option key={p.patch_id} value={p.patch_id}>
                      {p.title || formatPatchDate(p.patch_id)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {patch.data.overall_concept && (
            <div>
              <p className="font-mono text-xs uppercase text-tdf-muted mb-3">
                // Concepto general
              </p>
              <div className="hud-frame bg-tdf-charcoal px-5 py-4">
                <p className="font-body text-sm text-tdf-muted whitespace-pre-line leading-relaxed">
                  {lang === "es"
                    ? (patch.data.overall_concept_es ??
                      patch.data.overall_concept)
                    : patch.data.overall_concept}
                </p>
              </div>
            </div>
          )}

          {patch.data.universal_changes.length > 0 && (
            <div>
              <p className="font-mono text-xs uppercase text-tdf-muted mb-3">
                // Cambios universales
              </p>
              <div className="hud-frame bg-tdf-charcoal px-5 py-4">
                <ChangesTable
                  changes={patch.data.universal_changes}
                  lang={lang}
                />
              </div>
            </div>
          )}

          {characters.length > 0 && (
            <div>
              <p className="font-mono text-xs uppercase text-tdf-muted mb-3">
                // Cambios por personaje
              </p>
              <select
                value={selectedCharacter ?? ""}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full sm:w-64 bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-body mb-4"
              >
                {characters.map((c) => (
                  <option key={c.tool_name} value={c.tool_name}>
                    {c.alpha}
                  </option>
                ))}
              </select>

              {selected && (
                <div className="hud-frame bg-tdf-charcoal px-5 py-4">
                  <p
                    className={`font-display font-bold uppercase text-lg mb-3 ${characterColorClass(selected.alpha)}`}
                  >
                    {selected.alpha}
                  </p>
                  {selected.summary && (
                    <p className="font-body text-sm text-tdf-muted whitespace-pre-line leading-relaxed mb-4">
                      {lang === "es"
                        ? (selected.summary_es ?? selected.summary)
                        : selected.summary}
                    </p>
                  )}
                  <ChangesTable changes={selected.changes} lang={lang} />
                </div>
              )}
            </div>
          )}

          {characters.length === 0 &&
            patch.data.universal_changes.length === 0 &&
            !patch.data.overall_concept && (
              <p className="text-tdf-muted font-body">
                Este parche no tiene contenido guardado todavía.
              </p>
            )}
        </div>
      )}
    </Layout>
  );
}
