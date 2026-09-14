import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import InitialsAvatar from "../components/InitialsAvatar";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { listCharacters, getCharacterPlayers, getSf6Meta } from "../lib/api";
import { characterColorClass } from "../lib/characterColors";
import type {
  CharacterSummary,
  CharacterPlayerRow,
  UsageRateData,
} from "../lib/types";

/** Normaliza un nombre de personaje para cruzar nuestro character_name
 * (title-case, ej. "A.K.I.", "M. Bison") contra el character_alpha de
 * Capcom (formato propio, no confirmado al 100% si coincide siempre)
 * — sacando puntos, espacios y mayúsculas de ambos lados aumenta la
 * chance de match sin tener que hardcodear un mapeo manual por
 * personaje. Si igual no matchea para alguno, ese personaje
 * simplemente no muestra comparación — no rompe nada. */
function normalizeCharacterName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function PersonajesPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalUsage, setGlobalUsage] = useState<Map<string, number>>(
    new Map(),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [players, setPlayers] = useState<CharacterPlayerRow[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  useEffect(() => {
    listCharacters()
      .then(setCharacters)
      .finally(() => setLoading(false));

    // el meta global es un "nice to have" — si falla, la página
    // sigue andando sin la comparación, no bloquea nada
    getSf6Meta<UsageRateData>("usagerate")
      .then((snapshot) => {
        // mismo criterio confirmado en Sf6MetaPage.tsx: liga
        // league_rank=0 es "todas las ligas mezcladas"
        const leagues = snapshot.data?.usagerateData?.[0]?.val;
        const overall = leagues?.find((l) => l.league_rank === 0);
        if (!overall) return;
        const map = new Map<string, number>();
        for (const c of overall.val) {
          map.set(normalizeCharacterName(c.character_alpha), c.play_rate);
        }
        setGlobalUsage(map);
      })
      .catch(() => {});
  }, []);

  const toggleExpanded = (characterName: string) => {
    if (expanded === characterName) {
      setExpanded(null);
      return;
    }
    setExpanded(characterName);
    setPlayersLoading(true);
    getCharacterPlayers(characterName)
      .then(setPlayers)
      .finally(() => setPlayersLoading(false));
  };

  const rows = useMemo(
    () =>
      characters.map((c) => ({
        ...c,
        globalRate: globalUsage.get(normalizeCharacterName(c.character_name)),
      })),
    [characters, globalUsage],
  );

  return (
    <Layout>
      <SectionLabel index="01">Personajes</SectionLabel>
      <p className="text-tdf-muted font-body text-sm mb-6 max-w-2xl">
        Quién juega qué en TDF. Tocá un personaje para ver el ranking de quienes
        lo juegan, o para encontrar con quién practicar ese matchup.
      </p>

      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="font-mono text-xs text-tdf-muted">
          Todavía no hay personajes trackeados.
        </p>
      )}

      <div className="hud-frame bg-tdf-charcoal divide-y divide-tdf-line">
        {rows.map((c) => (
          <div key={c.character_name}>
            <button
              onClick={() => toggleExpanded(c.character_name)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-tdf-dark/40 transition-colors text-left"
            >
              <span
                className={`font-semibold flex-1 ${characterColorClass(c.character_name)}`}
              >
                {c.character_name}
              </span>
              <span className="font-mono text-[10px] text-tdf-muted shrink-0">
                {c.player_count} en TDF
              </span>
              {c.top_master_rating != null && (
                <span className="font-mono text-[10px] text-tdf-magenta shrink-0">
                  top {c.top_master_rating} MR
                </span>
              )}
              {c.globalRate != null && (
                <span className="font-mono text-[10px] text-tdf-muted shrink-0">
                  {c.globalRate.toFixed(1)}% del meta global
                </span>
              )}
              {expanded === c.character_name ? (
                <ChevronUp size={14} className="text-tdf-muted shrink-0" />
              ) : (
                <ChevronDown size={14} className="text-tdf-muted shrink-0" />
              )}
            </button>

            {expanded === c.character_name && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                {playersLoading && <Skeleton className="h-10 w-full" />}
                {!playersLoading &&
                  players.map((p) => (
                    <Link
                      key={p.cfn_id}
                      to={`/jugadores/${p.cfn_id}`}
                      className="flex items-center gap-3 px-3 py-2 bg-tdf-dark/40 hover:bg-tdf-dark/70 transition-colors rounded"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-tdf-charcoal">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <InitialsAvatar seed={p.display_name} size={7} />
                        )}
                      </div>
                      <span className="text-sm flex-1 truncate">
                        {p.display_name}
                      </span>
                      {p.win_rate != null && (
                        <span className="font-mono text-[10px] text-tdf-muted shrink-0">
                          {Math.round(p.win_rate * 100)}% WR
                        </span>
                      )}
                      {p.master_rating != null ? (
                        <span className="font-mono text-[10px] text-tdf-magenta shrink-0">
                          {p.master_rating} MR · {p.tier}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-tdf-muted shrink-0">
                          Sin rango
                        </span>
                      )}
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
