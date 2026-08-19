import { useEffect, useState } from "react";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  approveCfnRegistration,
  listPendingCfnRegistrations,
  rejectCfnRegistration,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import type { CFNRegistrationPending } from "../lib/types";

/** Popup de aprobación — deja ajustar el nombre final, la etiqueta TDF y
 * el link de Liquipedia antes de publicar, en vez de aceptar ciegamente
 * lo que la persona escribió al pedirlo (ver approve_registration en el
 * backend, is_tdf nunca se deriva solo). */
function ApproveModal({
  registration,
  onClose,
  onApproved,
}: {
  registration: CFNRegistrationPending;
  onClose: () => void;
  onApproved: () => void;
}) {
  const { token } = useAuth();
  const [displayName, setDisplayName] = useState(registration.display_name);
  const [isTdf, setIsTdf] = useState(false);
  const [liquipediaUrl, setLiquipediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    if (!token) return;
    setSubmitting(true);
    try {
      await approveCfnRegistration(token, registration.id, {
        display_name: displayName.trim() || undefined,
        is_tdf: isTdf,
        liquipedia_url: liquipediaUrl.trim() || undefined,
      });
      onApproved();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="hud-frame bg-tdf-charcoal border border-tdf-line w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-xs uppercase text-tdf-magenta">
            Aprobar solicitud
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="font-mono text-[10px] uppercase text-gray-500 mb-2">
          Nombre a mostrar
        </p>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-mono mb-4"
        />

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={isTdf}
            onChange={(e) => setIsTdf(e.target.checked)}
          />
          <span className="text-sm text-gray-300">Marcar como TDF</span>
        </label>

        <p className="font-mono text-[10px] uppercase text-gray-500 mb-2">
          Link de Liquipedia (opcional)
        </p>
        <input
          value={liquipediaUrl}
          onChange={(e) => setLiquipediaUrl(e.target.value)}
          placeholder="https://liquipedia.net/fighters/..."
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-mono mb-5"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border border-tdf-line hover:border-white transition-colors px-4 py-2 font-mono text-[11px] uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-[11px] uppercase text-white disabled:opacity-50"
          >
            {submitting ? "Aprobando..." : "Aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffCfnPage() {
  const { token } = useAuth();
  const [pending, setPending] = useState<CFNRegistrationPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [approving, setApproving] = useState<CFNRegistrationPending | null>(
    null,
  );
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    listPendingCfnRegistrations(token)
      .then(setPending)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleReject(id: string) {
    if (!token) return;
    setRejectingId(id);
    try {
      await rejectCfnRegistration(token, id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError(true);
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <Layout>
      <SectionLabel index="05">Street Fighter 6 CFN</SectionLabel>
      <h1 className="text-3xl font-bold mb-2">Solicitudes de CFN</h1>
      <p className="text-gray-500 mb-8 max-w-xl">
        Gente que pidió sumarse a /jugadores con su propio CFN ID. No aparecen
        ahí hasta que se aprueban acá.
      </p>

      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center gap-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-gray-500">
          No se pudo cargar la lista. Intenta de nuevo en un rato.
        </p>
      )}

      {!loading && !error && pending.length === 0 && (
        <p className="text-gray-500">No hay solicitudes pendientes.</p>
      )}

      {!loading && !error && pending.length > 0 && (
        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center gap-3 flex-wrap"
            >
              {p.twitch_avatar_url ? (
                <img
                  src={p.twitch_avatar_url}
                  alt={p.twitch_display_name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <InitialsAvatar seed={p.twitch_display_name} size={10} />
              )}
              <div className="flex-1 min-w-[180px]">
                <p className="font-semibold">
                  {p.display_name}{" "}
                  <span className="font-mono text-xs text-gray-500">
                    (@{p.twitch_username})
                  </span>
                </p>
                <p className="font-mono text-xs text-gray-600">
                  CFN {p.cfn_id}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleReject(p.id)}
                  disabled={rejectingId === p.id}
                  className="border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors px-3 py-1.5 font-mono text-[11px] uppercase disabled:opacity-50"
                >
                  {rejectingId === p.id ? "..." : "Rechazar"}
                </button>
                <button
                  onClick={() => setApproving(p)}
                  className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-3 py-1.5 font-mono text-[11px] uppercase text-white"
                >
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {approving && (
        <ApproveModal
          registration={approving}
          onClose={() => setApproving(null)}
          onApproved={() => {
            setPending((prev) => prev.filter((p) => p.id !== approving.id));
            setApproving(null);
          }}
        />
      )}
    </Layout>
  );
}
