import { useCallback, useEffect, useState } from "react";
import { getNotifications, markNotificationsRead } from "./api";
import type { AppNotification } from "./types";

// más seguido que useTwitchLiveStatus (3 min) porque una notificación
// vieja se siente peor que un dato de "en vivo" desactualizado, pero
// sin exagerar tampoco — 90s alcanza
const POLL_MS = 90 * 1000;

/** Notificaciones del usuario logueado, con polling periódico y
 * marcado en bloque al abrir el desplegable (ver markAllRead) — mismo
 * criterio de Instagram/Facebook, no hay marcado individual (pedido de
 * Seba, 29-08-2026). Sin sesión, no hace nada (ni siquiera pollea). */
export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    if (!token) return;
    getNotifications(token).then((r) => {
      setNotifications(r.notifications);
      setUnreadCount(r.unread_count);
    });
  }, [token]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [token, load]);

  async function markAllRead() {
    if (!token) return;
    // optimista — el numerito desaparece al toque al abrir el
    // desplegable, no espera la respuesta del servidor
    setUnreadCount(0);
    try {
      const r = await markNotificationsRead(token);
      setNotifications(r.notifications);
    } catch {
      load(); // si falló, se vuelve a pedir el estado real
    }
  }

  return { notifications, unreadCount, markAllRead };
}
