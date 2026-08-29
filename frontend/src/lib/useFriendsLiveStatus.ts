import { useEffect, useState } from "react";
import { getFriendsLiveStatus } from "./api";
import type { ChannelLiveStatus } from "./types";

// mismo intervalo que useTwitchLiveStatus, mismo motivo (el backend
// ya cachea ~45s de todas formas)
const POLL_MS = 3 * 60 * 1000;

/** Estado en vivo de Younghou y Pochoclo23 — pedido de Seba
 * (29-08-2026) para destacarlos en Home cuando estén transmitiendo.
 * Un solo request trae los dos (ver /twitch/friends-live-status). */
export function useFriendsLiveStatus(): ChannelLiveStatus[] {
  const [statuses, setStatuses] = useState<ChannelLiveStatus[]>([]);

  useEffect(() => {
    function load() {
      getFriendsLiveStatus()
        .then(setStatuses)
        .catch(() => setStatuses([]));
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return statuses;
}
