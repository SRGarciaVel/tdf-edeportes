import { useEffect, useState } from "react";
import { getRecentMatches } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import Skeleton from "./Skeleton";
import type { CFNMatchRead } from "../lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchRow({ match }: { match: CFNMatchRead }) {
  const resultLabel =
    match.won === true ? "WIN" : match.won === false ? "LOSE" : "?";
  const resultColor =
    match.won === true
      ? "text-emerald-400"
      : match.won === false
        ? "text-red-400"
        : "text-tdf-muted";

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-tdf-line/60 last:border-0">
      <div className="min-w-0">
        <p className="font-mono text-[11px] text-tdf-muted">
          {formatDate(match.played_at)}
        </p>
        <p className="text-sm truncate">
          <span className={characterColorClass(match.character_name)}>
            {match.character_name ?? "?"}
          </span>
          <span className="text-tdf-muted"> vs </span>
          <span className="text-gray-300">{match.opponent_name ?? "?"}</span>
          {match.opponent_character && (
            <span className={characterColorClass(match.opponent_character)}>
              {" "}
              ({match.opponent_character})
            </span>
          )}
        </p>
      </div>
      <span className={`font-mono text-xs font-bold shrink-0 ${resultColor}`}>
        {resultLabel}
      </span>
    </div>
  );
}

export default function MatchHistoryModal({
  playerName,
  cfnId,
  days,
  onClose,
}: {
  playerName: string;
  cfnId: string;
  days: number;
  onClose: () => void;
}) {
  const [matches, setMatches] = useState<CFNMatchRead[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getRecentMatches(cfnId, days)
      .then(setMatches)
      .catch(() => setError(true));
  }, [cfnId, days]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="hud-frame bg-tdf-charcoal w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-tdf-line flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold">{playerName}</h2>
            <p className="font-mono text-xs text-tdf-muted">
              Últimas partidas · {days} día{days > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-tdf-muted hover:text-white font-mono text-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-2 overflow-y-auto">
          {error && (
            <p className="text-red-400 text-sm py-4">
              No se pudo cargar el historial.
            </p>
          )}
          {!error && matches === null && (
            <div className="flex flex-col gap-1 py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-2 border-b border-tdf-line/60 last:border-0"
                >
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          )}
          {matches !== null && matches.length === 0 && (
            <p className="text-tdf-muted text-sm py-4 font-body">
              Sin partidas en este período.
            </p>
          )}
          {matches?.map((m, i) => (
            <MatchRow key={i} match={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
