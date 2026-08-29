import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import InitialsAvatar from "./InitialsAvatar";
import Skeleton from "./Skeleton";
import {
  createProfileComment,
  deleteProfileComment,
  listProfileComments,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ProfileComment } from "../lib/types";

const BODY_MAX_LENGTH = 500;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} a las ${time}`;
}

/** Comentarios en el perfil de un jugador — inspirado en los
 * comentarios de perfil de Steam (referencia real que mandó Seba,
 * 29-08-2026): otra razón para entrar al perfil de otra persona, no
 * solo mirar stats. Cualquier persona logueada con Twitch puede
 * comentar en cualquier perfil, esté o no en el roster ella misma.
 * Puede borrar: quien lo escribió, el dueño del perfil, o staff — el
 * backend ya resuelve esa lógica por comentario (ver can_delete),
 * este componente no la duplica. */
export default function CommentsSection({ cfnId }: { cfnId: string }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listProfileComments(cfnId, token ?? undefined)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [cfnId, token]);

  async function handlePost() {
    if (!token) return;
    const body = newBody.trim();
    if (!body) return;
    setPosting(true);
    setError(null);
    try {
      const created = await createProfileComment(token, cfnId, body);
      setComments((prev) => [created, ...prev]);
      setNewBody("");
    } catch {
      setError("No se pudo publicar el comentario. Prueba de nuevo.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!token) return;
    // optimista — si falla, se vuelve a pedir la lista completa en vez
    // de tratar de "deshacer" el estado a mano
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    try {
      await deleteProfileComment(token, commentId);
    } catch {
      setComments(prev);
      setError("No se pudo borrar el comentario.");
    }
  }

  return (
    <div className="hud-frame bg-tdf-charcoal px-6 py-5 flex flex-col gap-4">
      <h2 className="font-mono text-xs uppercase text-tdf-muted">
        Comentarios{comments.length > 0 && ` (${comments.length})`}
      </h2>

      {user && token ? (
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-tdf-dark">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <InitialsAvatar seed={user.display_name} size={9} />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={newBody}
              onChange={(e) =>
                setNewBody(e.target.value.slice(0, BODY_MAX_LENGTH))
              }
              placeholder="Añadir un comentario..."
              rows={2}
              className="w-full bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-2 text-sm font-body resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-tdf-muted">
                {newBody.length}/{BODY_MAX_LENGTH}
              </p>
              <button
                onClick={handlePost}
                disabled={posting || newBody.trim().length === 0}
                className="font-body text-xs font-medium px-3 py-1.5 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
              >
                {posting ? "Publicando..." : "Comentar"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="font-mono text-[10px] text-tdf-muted">
          Inicia sesión con Twitch para dejar un comentario.
        </p>
      )}

      {error && <p className="text-red-400 text-xs font-body">{error}</p>}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="font-mono text-[10px] text-tdf-muted">
          Todavía no hay comentarios. Sé el primero.
        </p>
      )}

      {!loading && comments.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-tdf-line pt-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-tdf-dark">
                {c.author.avatar_url ? (
                  <img
                    src={c.author.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <InitialsAvatar seed={c.author.display_name} size={9} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {c.author.display_name}
                  </p>
                  <p className="font-mono text-[10px] text-tdf-muted">
                    {formatDate(c.created_at)}
                  </p>
                </div>
                <p className="font-body text-sm text-tdf-muted whitespace-pre-wrap break-words">
                  {c.body}
                </p>
              </div>
              {c.can_delete && (
                <button
                  onClick={() => handleDelete(c.id)}
                  aria-label="Borrar comentario"
                  className="text-tdf-muted hover:text-red-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
