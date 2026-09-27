import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getSf6CharacterFrameData, listSf6Characters } from "../lib/api";
import type {
  SF6CharacterFrameData,
  SF6CharacterSummary,
  SF6FrameDataTable,
} from "../lib/types";

type Tab = "movelist" | "frame";

function FrameDataTable({ table }: { table: SF6FrameDataTable }) {
  return (
    <div className="flex flex-col gap-6">
      {table.sections.map((section) => (
        <div key={section.title}>
          <p className="font-mono text-xs uppercase text-tdf-magenta mb-2">
            {section.title}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-tdf-line">
                  {table.headers.map((h, i) => (
                    <th
                      key={i}
                      className="text-left font-mono uppercase text-tdf-muted px-2 py-1.5 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-tdf-line/40 hover:bg-tdf-magenta/5"
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-2 py-1.5 text-tdf-muted align-top"
                      >
                        {cell || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Frame Data y Command List oficiales de Capcom por personaje --
 * idea de Chubi (22-09-2026): en vez de mandar a la gente a un sitio
 * de terceros, mostrarlo acá directo, calcando las mismas 2 pestañas
 * que ya usa streetfighter.com en la página de cada personaje (TOP /
 * COMMAND LIST / FRAME DATA / COSTUME -- acá solo las 2 que importan
 * para esto). Los datos vienen del propio sitio oficial de Capcom,
 * cacheados por scripts/refresh_sf6_frame_data.py -- nunca se
 * dispara un fetch en vivo desde acá. */
export default function Sf6FrameDataPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [characters, setCharacters] = useState<SF6CharacterSummary[]>([]);
  const [charactersError, setCharactersError] = useState(false);
  const [data, setData] = useState<SF6CharacterFrameData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("frame");

  useEffect(() => {
    listSf6Characters()
      .then(setCharacters)
      .catch(() => setCharactersError(true));
  }, []);

  useEffect(() => {
    if (!slug) return;
    setData(null);
    setDataError(null);
    getSf6CharacterFrameData(slug)
      .then(setData)
      .catch(() =>
        setDataError(
          "Todavía no tenemos esta información guardada para este personaje.",
        ),
      );
  }, [slug]);

  if (!slug) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <SectionLabel index="01">Street Fighter 6</SectionLabel>
          <h1 className="font-display font-bold uppercase text-3xl mb-2">
            Frame Data
          </h1>
          <p className="text-tdf-muted font-body mb-8">
            Datos oficiales de Capcom, personaje por personaje. Elige uno para
            ver su Command List y Frame Data completos.
          </p>

          {charactersError && (
            <p className="text-tdf-muted font-body">
              No se pudo cargar la lista de personajes ahora mismo.
            </p>
          )}

          {characters.length === 0 && !charactersError && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {characters.map((c) => (
              <Link
                key={c.character_slug}
                to={`/sf6/frame-data/${c.character_slug}`}
                className="hud-frame bg-tdf-charcoal border border-tdf-line hover:border-tdf-magenta transition-colors px-3 py-4 text-center font-body text-sm"
              >
                {c.display_name}
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <SectionLabel index="01">Street Fighter 6</SectionLabel>
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="font-display font-bold uppercase text-3xl">
            {data?.display_name ?? slug}
          </h1>
          <Link
            to="/sf6/frame-data"
            className="shrink-0 font-mono text-[11px] uppercase text-tdf-purple hover:text-tdf-magenta transition-colors whitespace-nowrap"
          >
            ← Otro personaje
          </Link>
        </div>
        <p className="text-tdf-muted font-body mb-6">
          Datos oficiales de Capcom.
        </p>

        <div className="flex gap-2 mb-6 border-b border-tdf-line">
          <button
            onClick={() => setTab("movelist")}
            className={`font-mono text-xs uppercase px-4 py-2 border-b-2 transition-colors ${
              tab === "movelist"
                ? "border-tdf-magenta text-white"
                : "border-transparent text-tdf-muted hover:text-white"
            }`}
          >
            Command List
          </button>
          <button
            onClick={() => setTab("frame")}
            className={`font-mono text-xs uppercase px-4 py-2 border-b-2 transition-colors ${
              tab === "frame"
                ? "border-tdf-magenta text-white"
                : "border-transparent text-tdf-muted hover:text-white"
            }`}
          >
            Frame Data
          </button>
        </div>

        {dataError && <p className="text-tdf-muted font-body">{dataError}</p>}

        {!data && !dataError && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {data && (
          <FrameDataTable
            table={tab === "frame" ? data.frame_data : data.move_list}
          />
        )}
      </div>
    </Layout>
  );
}
