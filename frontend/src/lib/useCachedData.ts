import { useCallback, useEffect, useState } from "react";
import { getCached, setCached, subscribeCache } from "./pageCache";

// cuánto tiempo un dato cacheado se considera "fresco" (no dispara un
// refetch automático al volver a la página) — 60s alcanza para el
// caso real que motivó esto: ir y volver entre /jugadores y otra
// página en la misma sesión de navegación, no minimizar pedidos al
// backend a toda costa
const STALE_MS = 60_000;

/** Igual que un fetch normal (data/loading), pero: 1) si ya hay algo
 * cacheado para `key`, lo muestra al toque sin skeleton, y 2) revalida
 * de fondo si ese dato tiene más de STALE_MS — sin bloquear la
 * pantalla con loading mientras tanto, salvo que no hubiera nada
 * cacheado todavía.
 *
 * `fetcher` NO va en las dependencias del efecto a propósito (patrón
 * común de este tipo de hook) — si se define una función nueva en
 * cada render del componente que llama a este hook, igual solo se
 * vuelve a pedir cuando cambia `key`, no en cada render. Quien use
 * este hook debe tratar `fetcher` como estable (definida afuera del
 * componente, o con useCallback si depende de algo que cambia). */
export function useCachedData<T>(key: string, fetcher: () => Promise<T>) {
  const initial = getCached<T>(key);
  const [data, setData] = useState<T | undefined>(initial?.data);
  const [loading, setLoading] = useState(initial === undefined);

  const refresh = useCallback((): Promise<T | undefined> => {
    return fetcher()
      .then((result) => {
        setCached(key, result);
        return result;
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const unsubscribe = subscribeCache(key, () => {
      setData(getCached<T>(key)?.data);
    });

    const entry = getCached<T>(key);
    const isStale = !entry || Date.now() - entry.timestamp > STALE_MS;

    if (isStale) {
      if (!entry) setLoading(true);
      refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, refresh };
}
