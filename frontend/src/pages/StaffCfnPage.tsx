import { useEffect, useState } from "react";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  approveCfnRegistration,
  linkAccount,
  listPendingCfnRegistrations,
  listUnlinkedRegistrations,
  rejectCfnRegistration,
  searchUsers,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import type {
  CFNRegistrationPending,
  UnlinkedRegistration,
  UserSearchResult,
} from "../lib/types";

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
            className="text-tdf-muted hover:text-white text-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
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

        <p className="font-mono text-[10px] uppercase text-tdf-muted mb-2">
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

/** Búsqueda manual — para cuando no hay sugerencia automática (el
 * nombre del roster viejo no calza exacto con ningún @ de Twitch, ej.
 * "TDF Super Ñema", "Jager Eins"). Nunca vincula solo, siempre requiere
 * que staff elija de la lista de resultados. */
function LinkAccountModal({
  registration,
  onClose,
  onLinked,
}: {
  registration: UnlinkedRegistration;
  onClose: () => void;
  onLinked: () => void;
}) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      searchUsers(token, query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300); // debounce, no buscar en cada tecla
    return () => clearTimeout(timeout);
  }, [query, token]);

  async function handleLink(userId: string) {
    if (!token) return;
    setLinkingId(userId);
    try {
      await linkAccount(token, registration.cfn_id, userId);
      onLinked();
    } catch {
      setLinkingId(null);
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
            Buscar cuenta para {registration.display_name}
          </h3>
          <button
            onClick={onClose}
            className="text-tdf-muted hover:text-white text-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre de usuario de Twitch..."
          autoFocus
          className="w-full bg-tdf-dark border border-tdf-line px-3 py-2 text-sm font-mono mb-3"
        />

        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {searching && (
            <p className="font-body text-xs text-tdf-muted">Buscando...</p>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="font-body text-xs text-tdf-muted">
              Sin resultados para "{query}".
            </p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => handleLink(u.id)}
              disabled={linkingId === u.id}
              className="flex items-center gap-2 border border-tdf-line hover:border-tdf-magenta transition-colors px-3 py-2 text-left disabled:opacity-50"
            >
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt={u.display_name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <InitialsAvatar seed={u.display_name} size={8} />
              )}
              <span className="min-w-0 flex-1">
                <p className="font-body text-sm truncate">{u.display_name}</p>
                <p className="font-mono text-[11px] text-tdf-muted truncate">
                  @{u.twitch_username}
                </p>
              </span>
              <span className="font-body text-[11px] text-tdf-magenta shrink-0">
                {linkingId === u.id ? "Vinculando..." : "Vincular →"}
              </span>
            </button>
          ))}
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
  const [unlinked, setUnlinked] = useState<UnlinkedRegistration[]>([]);
  const [unlinkedLoading, setUnlinkedLoading] = useState(true);
  const [linkingCandidate, setLinkingCandidate] = useState<string | null>(null);
  const [searchingFor, setSearchingFor] = useState<UnlinkedRegistration | null>(
    null,
  );

  function load() {
    if (!token) return;
    setLoading(true);
    listPendingCfnRegistrations(token)
      .then(setPending)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  function loadUnlinked() {
    if (!token) return;
    setUnlinkedLoading(true);
    listUnlinkedRegistrations(token)
      .then(setUnlinked)
      .catch(() => {})
      .finally(() => setUnlinkedLoading(false));
  }

  useEffect(load, [token]);
  useEffect(loadUnlinked, [token]);

  async function handleLinkCandidate(cfnId: string, userId: string) {
    if (!token) return;
    setLinkingCandidate(cfnId);
    try {
      await linkAccount(token, cfnId, userId);
      setUnlinked((prev) => prev.filter((r) => r.cfn_id !== cfnId));
    } catch {
      // se queda en la lista, staff puede reintentar
    } finally {
      setLinkingCandidate(null);
    }
  }

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
      <p className="text-tdf-muted mb-8 max-w-xl font-body">
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
        <p className="text-tdf-muted font-body">
          No se pudo cargar la lista. Intenta de nuevo en un rato.
        </p>
      )}

      {!loading && !error && pending.length === 0 && (
        <p className="text-tdf-muted font-body">
          No hay solicitudes pendientes.
        </p>
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
                  <span className="font-mono text-xs text-tdf-muted">
                    (@{p.twitch_username})
                  </span>
                </p>
                <p className="font-mono text-xs text-tdf-muted">
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

      <div className="mt-14 pt-8 border-t border-tdf-line">
        <h2 className="text-2xl font-bold mb-2">Vincular cuentas de Twitch</h2>
        <p className="text-tdf-muted mb-6 max-w-xl font-body">
          Jugadores del roster original (de antes del auto-registro) sin cuenta
          de Twitch asociada — por eso no tienen avatar real ni pueden
          personalizar su propia card. Se sugiere una cuenta solo cuando el
          nombre calza exacto; para el resto, hay que buscarla a mano.
        </p>

        {unlinkedLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center gap-3"
              >
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        )}

        {!unlinkedLoading && unlinked.length === 0 && (
          <p className="text-tdf-muted font-body">
            Todos los jugadores del roster ya tienen cuenta vinculada.
          </p>
        )}

        {!unlinkedLoading && unlinked.length > 0 && (
          <div className="flex flex-col gap-3">
            {unlinked.map((r) => (
              <div
                key={r.cfn_id}
                className="hud-frame bg-tdf-charcoal px-5 py-4 flex items-center gap-3 flex-wrap"
              >
                <InitialsAvatar seed={r.display_name} size={10} />
                <div className="flex-1 min-w-[160px]">
                  <p className="font-semibold">{r.display_name}</p>
                  <p className="font-mono text-xs text-tdf-muted">
                    CFN {r.cfn_id}
                  </p>
                </div>

                {r.candidate ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-xs text-tdf-muted">
                      Sugerencia:{" "}
                      <span className="text-white">
                        @{r.candidate.twitch_username}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        handleLinkCandidate(r.cfn_id, r.candidate!.user_id)
                      }
                      disabled={linkingCandidate === r.cfn_id}
                      className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-3 py-1.5 font-mono text-[11px] uppercase text-white disabled:opacity-50"
                    >
                      {linkingCandidate === r.cfn_id
                        ? "Vinculando..."
                        : "Vincular"}
                    </button>
                    <button
                      onClick={() => setSearchingFor(r)}
                      className="font-body text-[11px] text-tdf-muted hover:text-white transition-colors"
                    >
                      No es esta cuenta →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSearchingFor(r)}
                    className="border border-tdf-line hover:border-tdf-magenta transition-colors px-3 py-1.5 font-mono text-[11px] uppercase text-tdf-muted hover:text-white"
                  >
                    Buscar cuenta
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

      {searchingFor && (
        <LinkAccountModal
          registration={searchingFor}
          onClose={() => setSearchingFor(null)}
          onLinked={() => {
            setUnlinked((prev) =>
              prev.filter((r) => r.cfn_id !== searchingFor.cfn_id),
            );
            setSearchingFor(null);
          }}
        />
      )}
    </Layout>
  );
}
