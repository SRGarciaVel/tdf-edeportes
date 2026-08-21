import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getSf6Meta } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type {
  DiaCharacterRecord,
  DiaData,
  MetaSnapshot,
  UsageRateCharacter,
  UsageRateData,
} from "../lib/types";

/** "202607" -> "julio 2026" */
function formatMonth(month: string): string {
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
  const year = month.slice(0, 4);
  const monthIdx = parseInt(month.slice(4, 6), 10) - 1;
  return `${MESES[monthIdx] ?? "?"} ${year}`;
}

function UsageBar({ character }: { character: UsageRateCharacter }) {
  const delta = character.play_rate - character.previous_rate;
  return (
    <div className="flex items-center gap-3">
      <span
        className={`font-body text-sm w-28 shrink-0 truncate ${characterColorClass(character.character_alpha)}`}
      >
        {character.character_alpha}
      </span>
      <div className="flex-1 h-2 bg-tdf-line overflow-hidden">
        <div
          className="h-full bg-tdf-magenta"
          style={{ width: `${Math.min(100, character.play_rate * 6)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-white w-14 text-right shrink-0">
        {character.play_rate.toFixed(1)}%
      </span>
      <span
        className={`font-mono text-[10px] w-12 text-right shrink-0 ${
          delta > 0.05
            ? "text-tdf-magenta"
            : delta < -0.05
              ? "text-tdf-muted"
              : "text-tdf-muted opacity-50"
        }`}
      >
        {delta > 0.05 ? "▲" : delta < -0.05 ? "▼" : "·"}{" "}
        {Math.abs(delta).toFixed(1)}
      </span>
    </div>
  );
}

function MatchupRow({
  record,
  opponentName,
}: {
  record: DiaCharacterRecord["values"][number];
  opponentName: string;
}) {
  const isDash = record.val === "-" || record.val === "-.---";
  const score = isDash ? null : parseFloat(record.val);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-tdf-line/40 last:border-b-0">
      <span
        className={`font-body text-sm ${characterColorClass(opponentName)}`}
      >
        {opponentName}
      </span>
      {score == null ? (
        <span className="font-mono text-xs text-tdf-muted">Sin datos</span>
      ) : (
        <span
          className={`font-mono text-xs font-semibold ${
            record.thm > 0
              ? "text-sky-400"
              : record.thm < 0
                ? "text-orange-400"
                : "text-tdf-muted"
          }`}
        >
          {score.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default function Sf6MetaPage() {
  const [rankMode, setRankMode] = useState<"overall" | "master">("overall");
  const [usageSnapshot, setUsageSnapshot] =
    useState<MetaSnapshot<UsageRateData> | null>(null);
  const [diaSnapshot, setDiaSnapshot] = useState<MetaSnapshot<DiaData> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );
  const [inputType, setInputType] = useState<"M" | "C">("M");

  useEffect(() => {
    setLoading(true);
    setError(false);
    const usageType = rankMode === "master" ? "usagerate_master" : "usagerate";
    const diaType = rankMode === "master" ? "dia_master" : "dia";

    Promise.all([
      getSf6Meta<UsageRateData>(usageType),
      getSf6Meta<DiaData>(diaType),
    ])
      .then(([usage, dia]) => {
        setUsageSnapshot(usage);
        setDiaSnapshot(dia);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [rankMode]);

  // liga 0 = "ALL" (todas las ligas mezcladas), tipo de control 0 =
  // todos combinados — mismo criterio que muestra la página real por
  // default. No confirmado al 100% el orden exacto de operation_type,
  // pero el índice 0 es la vista general en los datos reales que vimos.
  const usageCharacters = useMemo(() => {
    const all = usageSnapshot?.data?.usagerateData?.[0]?.val?.find(
      (l) => l.league_rank === 0,
    );
    if (!all) return [];
    return [...all.val].sort((a, b) => b.play_rate - a.play_rate);
  }, [usageSnapshot]);

  const diaRecords = useMemo(() => {
    const ciSort = diaSnapshot?.data?.diaData?.ci?.ci_sort;
    if (!ciSort) return [];
    const firstKey = Object.keys(ciSort)[0];
    return ciSort[firstKey]?.records ?? [];
  }, [diaSnapshot]);

  const characterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of diaRecords) {
      if (r.input_type === inputType) seen.set(r.tool_name, r.name_alpha);
    }
    return [...seen.entries()];
  }, [diaRecords, inputType]);

  const selectedRecord = useMemo(() => {
    return diaRecords.find(
      (r) => r.tool_name === selectedCharacter && r.input_type === inputType,
    );
  }, [diaRecords, selectedCharacter, inputType]);

  const opponentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of diaRecords) {
      if (r.input_type === inputType) map.set(r.id, r.name_alpha);
    }
    return map;
  }, [diaRecords, inputType]);

  const sortedMatchups = useMemo(() => {
    if (!selectedRecord) return [];
    return [...selectedRecord.values]
      .filter((v) => v._oid !== selectedRecord.id)
      .sort((a, b) => {
        const aVal = a.val === "-.---" ? -1 : parseFloat(a.val);
        const bVal = b.val === "-.---" ? -1 : parseFloat(b.val);
        return bVal - aVal;
      });
  }, [selectedRecord]);

  // primera carga: elegir un personaje por default una vez que hay opciones
  useEffect(() => {
    if (!selectedCharacter && characterOptions.length > 0) {
      setSelectedCharacter(characterOptions[0][0]);
    }
  }, [characterOptions, selectedCharacter]);

  return (
    <Layout>
      <SectionLabel index="10">Street Fighter 6</SectionLabel>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-3xl font-bold">Meta actual</h1>
        <div className="flex gap-2 font-mono text-xs">
          {(["overall", "master"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setRankMode(m)}
              className={`px-3 py-1 border transition-colors ${
                rankMode === m
                  ? "border-tdf-magenta text-tdf-magenta"
                  : "border-tdf-line text-tdf-muted hover:text-white"
              }`}
            >
              {m === "overall" ? "Todos los rangos" : "Solo Master"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-tdf-muted mb-8 max-w-xl font-body">
        Dato global de Capcom, de todo el juego — no específico de TDF. Se
        actualiza una vez al mes.
        {usageSnapshot && (
          <span className="block font-mono text-xs mt-1 opacity-70">
            Datos de {formatMonth(usageSnapshot.month)}
          </span>
        )}
      </p>

      {error && (
        <p className="text-tdf-muted font-body">
          No se pudo cargar el meta actual. Puede que el cron mensual todavía no
          haya corrido — intenta de nuevo más tarde.
        </p>
      )}

      {!error && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-mono text-xs uppercase text-tdf-muted mb-4">
              // Uso de personajes
            </h2>
            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {usageCharacters.map((c) => (
                  <UsageBar key={c.character_tool_name} character={c} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-mono text-xs uppercase text-tdf-muted">
                // Matchups
              </h2>
              <div className="flex gap-2 font-mono text-[11px]">
                {(["M", "C"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setInputType(t)}
                    className={`px-2 py-1 border transition-colors ${
                      inputType === t
                        ? "border-tdf-magenta text-tdf-magenta"
                        : "border-tdf-line text-tdf-muted"
                    }`}
                  >
                    {t === "M" ? "Modern" : "Classic"}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <select
                  value={selectedCharacter ?? ""}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-body mb-4"
                >
                  {characterOptions.map(([toolName, alpha]) => (
                    <option key={toolName} value={toolName}>
                      {alpha}
                    </option>
                  ))}
                </select>

                <div className="hud-frame bg-tdf-charcoal px-4 py-3 max-h-96 overflow-y-auto">
                  {sortedMatchups.length === 0 ? (
                    <p className="font-body text-sm text-tdf-muted">
                      Sin datos de matchups disponibles.
                    </p>
                  ) : (
                    sortedMatchups.map((m) => (
                      <MatchupRow
                        key={m._oid}
                        record={m}
                        opponentName={opponentNameById.get(m._oid) ?? "?"}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
