/** Caché en memoria, compartido por toda la SPA mientras dure la
 * pestaña abierta (se pierde en un F5, que es lo correcto — no debe
 * sobrevivir a una recarga real). Vive en un Map a nivel de módulo, no
 * en un Context de React, a propósito: así cualquier página puede
 * leer/escribir la misma clave sin tener que envolver toda la app en
 * un Provider nuevo — menos superficie de cambio, ver conversación con
 * Seba (29-08-2026) sobre mantener esto acotado.
 *
 * No reemplaza los `useState` locales que cada página ya usa para sus
 * datos — vive AL LADO de eso (ver useCachedData.ts). Las mutaciones
 * (crear/borrar/aprobar) siguen actualizando el estado local como
 * hasta ahora; lo único que cambia es que también avisan acá, para
 * que si la persona navega a otra página y vuelve, no vea una versión
 * vieja pisando lo que acaba de cambiar. */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

export function getCached<T>(key: string): CacheEntry<T> | undefined {
  return cache.get(key) as CacheEntry<T> | undefined;
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
  listeners.get(key)?.forEach((cb) => cb());
}

export function subscribeCache(key: string, cb: () => void): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  return () => listeners.get(key)?.delete(cb);
}
