import { useEffect, useState } from "react";
import { getTwitchLiveStatus } from "./api";
import type { TwitchLiveStatus } from "./types";

// mismo intervalo que EncounterNotifications — no hace falta más
// seguido, el backend ya cachea ~45s de todas formas
const POLL_MS = 3 * 60 * 1000;

/** Estado real de en vivo/offline del canal de TDF, con polling
 * periódico — pensado para reutilizarse en más de un lugar (navbar,
 * hero de Home) sin repetir la lógica de fetch/intervalo en cada uno. */
export function useTwitchLiveStatus(): TwitchLiveStatus | null {
  const [status, setStatus] = useState<TwitchLiveStatus | null>(null);

  useEffect(() => {
    function load() {
      getTwitchLiveStatus()
        .then(setStatus)
        .catch(() =>
          setStatus({ is_live: false, title: null, viewer_count: null }),
        );
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return status;
}
