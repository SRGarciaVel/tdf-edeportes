import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import { listCfnPlayers } from "../lib/api";
import type { CFNProfile } from "../lib/types";

interface PlayerEntry {
  name: string;
  cfnId: string;
}

const TDF_PLAYERS: PlayerEntry[] = [
  { name: "Sirxtias", cfnId: "2844671427" },
  { name: "Drachen", cfnId: "2908057346" },
  { name: "BF", cfnId: "4100957688" },
  { name: "AckermanFG", cfnId: "1733837998" },
];

const SCENE_PLAYERS: PlayerEntry[] = [
  { name: "Younghou", cfnId: "1027356162" },
  { name: "Pochoclo23", cfnId: "3987753314" },
  { name: "Craime", cfnId: "1009159858" },
  { name: "Blaz", cfnId: "3381453962" },
];

function PlayerCard({ player, profile }: { player: PlayerEntry; profile?: CFNProfile }) {
  const hasStats = profile && !profile.last_error && (profile.league_points != null || profile.character_name);

  return (
    <div className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center justify-between">
      <div>
        <p className="font-semibold">{player.name}</p>
        <p className="font-mono text-xs text-gray-600">CFN {player.cfnId}</p>
        {hasStats && profile.character_name && (
          <p className="font-mono text-xs text-tdf-purple mt-1">{profile.character_name}</p>
        )}
      </div>
      {hasStats ? (
        <div className="text-right">
          {profile.master_rating != null && (
            <span className="font-mono text-xs uppercase text-tdf-magenta border border-tdf-magenta/40 px-2 py-1">
              {profile.master_rating} MR
            </span>
          )}
          {profile.league_points != null && (
            <p className="font-mono text-xs text-gray-500 mt-1">{profile.league_points} LP</p>
          )}
        </div>
      ) : (
        <span className="font-mono text-xs uppercase text-gray-600 border border-tdf-line px-2 py-1">
          Próximamente
        </span>
      )}
    </div>
  );
}

export default function JugadoresPage() {
  const [profiles, setProfiles] = useState<Map<string, CFNProfile>>(new Map());

  useEffect(() => {
    listCfnPlayers()
      .then((data) => setProfiles(new Map(data.map((p) => [p.cfn_id, p]))))
      .catch(() => setProfiles(new Map()));
  }, []);

  return (
    <Layout>
      <SectionLabel index="05">Street Fighter 6 CFN</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Jugadores</h1>
      <p className="text-gray-500 mb-10 max-w-xl">
        Rango, LP y personaje principal de la escena. Se actualiza cada
        hora, no en vivo.
      </p>

      <div className="mb-10">
        <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">TDF</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {TDF_PLAYERS.map((p) => (
            <PlayerCard key={p.cfnId} player={p} profile={profiles.get(p.cfnId)} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-mono text-xs uppercase text-gray-400 mb-3">
          Escena chilena
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {SCENE_PLAYERS.map((p) => (
            <PlayerCard key={p.cfnId} player={p} profile={profiles.get(p.cfnId)} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
