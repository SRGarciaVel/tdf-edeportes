import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Swords, Trash2, X } from "lucide-react";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import InitialsAvatar from "../components/InitialsAvatar";
import { useAuth } from "../lib/auth";
import { resizeImageFile } from "../lib/imageResize";
import {
  listCharacters,
  getCharacterPlayers,
  getCharacterFanartMap,
  setCharacterFanart,
  deleteCharacterFanart,
  getSf6Meta,
} from "../lib/api";
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

/** Orden de lanzamiento real de cada personaje en SF6 — plantel base
 * (2 de junio de 2023) primero, después cada DLC en el orden real en
 * que salió (confirmado con fuentes reales, 12-09-2026, incluido
 * Arjun que sale recién el 13 de octubre de 2026 — todavía no hay
 * nadie de TDF que lo juegue, pero queda listo para cuando lo haya).
 * Comparación siempre normalizada (ver normalizeCharacterName) porque
 * nuestro propio .title() en Python da resultados raros para algunos
 * nombres (ej. "JP" queda guardado como "Jp", no "JP") — comparar en
 * mayúsculas sin puntuación evita depender de acertarle a ese detalle. */
const CHARACTER_RELEASE_ORDER = [
  "Ryu",
  "Chun-Li",
  "Luke",
  "Jamie",
  "Ken",
  "Guile",
  "Kimberly",
  "Juri",
  "Blanka",
  "Dhalsim",
  "E. Honda",
  "Dee Jay",
  "Manon",
  "Marisa",
  "JP",
  "Zangief",
  "Lily",
  "Cammy",
  "Rashid",
  "A.K.I.",
  "Ed",
  "Akuma",
  "M. Bison",
  "Terry",
  "Mai",
  "Elena",
  "Sagat",
  "C. Viper",
  "Alex",
  "Ingrid",
  "Yasmine",
  "Arjun",
].map(normalizeCharacterName);

/** Índice de lanzamiento de un personaje — los que no están en la
 * lista (nombre nuevo que todavía no agregamos acá, o un typo real de
 * la fuente que scrapeamos) van al final, ordenados alfabéticamente
 * entre ellos en vez de desaparecer o romper el orden de los demás. */
function releaseOrderIndex(characterName: string): number {
  const idx = CHARACTER_RELEASE_ORDER.indexOf(
    normalizeCharacterName(characterName),
  );
  return idx === -1 ? CHARACTER_RELEASE_ORDER.length : idx;
}

function CharacterCard({
  character,
  fanartUrl,
  globalRate,
  canEditFanart,
  uploading,
  onOpenRoster,
  onUploadClick,
  onRemove,
}: {
  character: CharacterSummary;
  fanartUrl: string | undefined;
  globalRate: number | undefined;
  canEditFanart: boolean;
  uploading: boolean;
  onOpenRoster: () => void;
  onUploadClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onOpenRoster}
      className="group relative aspect-[3/4] rounded overflow-hidden border border-tdf-line cursor-pointer bg-tdf-charcoal"
    >
      {fanartUrl ? (
        <img
          src={fanartUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Swords size={28} className="text-tdf-muted opacity-30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      <div className="absolute bottom-0 inset-x-0 p-2.5">
        <p
          className={`font-display font-bold text-sm leading-tight truncate ${characterColorClass(character.character_name)}`}
        >
          {character.character_name}
        </p>
        <p className="font-mono text-[9px] text-tdf-muted mt-0.5">
          {character.player_count} en TDF
          {character.top_master_rating != null &&
            ` · top ${character.top_master_rating} MR`}
        </p>
        {globalRate != null && (
          <div
            className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden"
            title={`${globalRate.toFixed(1)}% del meta global`}
          >
            <div
              className="h-full bg-tdf-magenta"
              style={{ width: `${Math.min(100, globalRate * 4)}%` }}
            />
          </div>
        )}
      </div>

      {canEditFanart && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUploadClick();
            }}
            disabled={uploading}
            className="bg-black/70 hover:bg-black/90 rounded p-1.5 text-white disabled:opacity-50"
            title="Subir fan art"
          >
            <Camera size={12} />
          </button>
          {fanartUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={uploading}
              className="bg-black/70 hover:bg-black/90 rounded p-1.5 text-white disabled:opacity-50"
              title="Sacar fan art"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CharacterRosterModal({
  characterName,
  onClose,
}: {
  characterName: string;
  onClose: () => void;
}) {
  const [players, setPlayers] = useState<CharacterPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCharacterPlayers(characterName)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, [characterName]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="hud-frame bg-tdf-charcoal max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-tdf-line sticky top-0 bg-tdf-charcoal">
          <h2
            className={`font-display font-bold text-lg ${characterColorClass(characterName)}`}
          >
            {characterName}
          </h2>
          <button onClick={onClose} className="text-tdf-muted hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          {!loading && players.length === 0 && (
            <p className="font-mono text-xs text-tdf-muted">
              Nadie de TDF juega este personaje todavía.
            </p>
          )}
          {!loading &&
            players.map((p) => (
              <Link
                key={p.cfn_id}
                to={`/jugadores/${p.cfn_id}`}
                className="flex items-center gap-3 px-3 py-2 bg-tdf-dark/40 hover:bg-tdf-dark/70 transition-colors rounded"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-tdf-charcoal">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar seed={p.display_name} size={8} />
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
      </div>
    </div>
  );
}

export default function PersonajesPage() {
  const { user, token } = useAuth();
  const canEditFanart = user?.twitch_username?.toLowerCase() === "ackermanfg";

  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fanartMap, setFanartMap] = useState<Record<string, string>>({});
  const [globalUsage, setGlobalUsage] = useState<Map<string, number>>(
    new Map(),
  );
  const [openCharacter, setOpenCharacter] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  useEffect(() => {
    listCharacters()
      .then(setCharacters)
      .finally(() => setLoading(false));

    getCharacterFanartMap().then(setFanartMap);

    // el meta global es un "nice to have" — si falla, la página sigue
    // andando sin la comparación, no bloquea nada
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

  const rows = useMemo(
    () =>
      characters
        .map((c) => ({
          ...c,
          globalRate: globalUsage.get(normalizeCharacterName(c.character_name)),
        }))
        .sort(
          (a, b) =>
            releaseOrderIndex(a.character_name) -
              releaseOrderIndex(b.character_name) ||
            a.character_name.localeCompare(b.character_name),
        ),
    [characters, globalUsage],
  );

  const handleUploadClick = (characterName: string) => {
    uploadTargetRef.current = characterName;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const characterName = uploadTargetRef.current;
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file || !characterName || !token) return;

    setUploadingFor(characterName);
    try {
      const dataUrl = await resizeImageFile(file, 400, 0.85);
      await setCharacterFanart(token, characterName, dataUrl);
      setFanartMap((prev) => ({ ...prev, [characterName]: dataUrl }));
    } finally {
      setUploadingFor(null);
    }
  };

  const handleRemove = async (characterName: string) => {
    if (!token) return;
    setUploadingFor(characterName);
    try {
      await deleteCharacterFanart(token, characterName);
      setFanartMap((prev) => {
        const next = { ...prev };
        delete next[characterName];
        return next;
      });
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <Layout>
      <SectionLabel index="01">Personajes</SectionLabel>
      <p className="text-tdf-muted font-body text-sm mb-6 max-w-2xl">
        Quién juega qué en TDF. Elige un personaje para ver el ranking de
        quienes lo juegan, o para encontrar con quién practicar ese matchup.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
      />

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="font-mono text-xs text-tdf-muted">
          Todavía no hay personajes trackeados.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rows.map((c) => (
            <CharacterCard
              key={c.character_name}
              character={c}
              fanartUrl={fanartMap[c.character_name]}
              globalRate={c.globalRate}
              canEditFanart={canEditFanart}
              uploading={uploadingFor === c.character_name}
              onOpenRoster={() => setOpenCharacter(c.character_name)}
              onUploadClick={() => handleUploadClick(c.character_name)}
              onRemove={() => handleRemove(c.character_name)}
            />
          ))}
        </div>
      )}

      {openCharacter && (
        <CharacterRosterModal
          characterName={openCharacter}
          onClose={() => setOpenCharacter(null)}
        />
      )}
    </Layout>
  );
}
