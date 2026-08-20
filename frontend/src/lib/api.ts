import type {
  EventFormValues,
  EventItem,
  QuarterlyGoal,
  User,
  CFNPlayer,
  CFNRegistration,
  CFNRegistrationPending,
  CFNMatchStats,
  CFNMatchRead,
  EncounterData,
  TierListData,
  TierListSummaryData,
  TierItemData,
  TierMetaData,
  TierListTemplateData,
  TierListTemplateSummaryData,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

interface TwitchLoginResponse {
  authorize_url: string;
  state: string;
}

export async function getTwitchLoginUrl(): Promise<TwitchLoginResponse> {
  const res = await fetch(`${API_URL}/auth/twitch/login`);
  if (!res.ok) throw new Error("No se pudo iniciar el login con Twitch");
  return res.json();
}

interface TwitchCallbackResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function exchangeTwitchCode(
  code: string,
  state: string,
): Promise<TwitchCallbackResponse> {
  const res = await fetch(`${API_URL}/auth/twitch/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "No se pudo completar el login");
  }
  return res.json();
}

export async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Sesión inválida");
  return res.json();
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.detail)
      ? body.detail.map((d: { msg: string }) => d.msg).join(", ")
      : (body.detail ?? `Error ${res.status}`);
    throw new Error(detail);
  }
  return res.json();
}

export async function listEvents(token: string | null): Promise<EventItem[]> {
  const res = await fetch(`${API_URL}/events`, { headers: authHeaders(token) });
  return parseOrThrow<EventItem[]>(res);
}

export async function createEvent(
  token: string,
  payload: EventFormValues,
): Promise<EventItem> {
  const res = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<EventItem>(res);
}

export async function updateEvent(
  token: string,
  id: string,
  payload: Partial<EventFormValues>,
): Promise<EventItem> {
  const res = await fetch(`${API_URL}/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<EventItem>(res);
}

export async function deleteEvent(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/events/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`No se pudo borrar el evento (${res.status})`);
}

export async function listGoals(year?: number): Promise<QuarterlyGoal[]> {
  const query = year ? `?year=${year}` : "";
  const res = await fetch(`${API_URL}/goals${query}`);
  return parseOrThrow<QuarterlyGoal[]>(res);
}

export async function listCfnPlayers(): Promise<CFNPlayer[]> {
  const res = await fetch(`${API_URL}/cfn/players`);
  return parseOrThrow<CFNPlayer[]>(res);
}

// auto-registro — requiere login, queda pendiente hasta que staff lo
// apruebe (GET /cfn/registrations/pending). Rate-limited en el backend
// (5/hora por IP).
export async function registerCfn(
  token: string,
  cfnId: string,
  avatarOverride?: string,
): Promise<CFNRegistration> {
  const res = await fetch(`${API_URL}/cfn/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ cfn_id: cfnId, avatar_override: avatarOverride }),
  });
  return parseOrThrow<CFNRegistration>(res);
}

// la propia persona cambia su foto de fondo cuando quiera — requiere
// tener el registro ya aprobado (el backend lo valida, 403 si no)
export async function updateMyCardBackground(
  token: string,
  cardBackgroundUrl: string,
): Promise<CFNRegistration> {
  const res = await fetch(`${API_URL}/cfn/register/me/background`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ card_background_url: cardBackgroundUrl }),
  });
  return parseOrThrow<CFNRegistration>(res);
}

// staff sube o reemplaza la foto de CUALQUIER jugador (moderación)
export async function setPlayerCardBackground(
  token: string,
  cfnId: string,
  cardBackgroundUrl: string,
): Promise<CFNRegistration> {
  const res = await fetch(`${API_URL}/cfn/players/${cfnId}/background`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ card_background_url: cardBackgroundUrl }),
  });
  return parseOrThrow<CFNRegistration>(res);
}

// staff saca la foto de un jugador — vuelve al estado por default
export async function removePlayerCardBackground(
  token: string,
  cfnId: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/cfn/players/${cfnId}/background`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
  }
}

// null si nunca pidió nada — el backend también devuelve null (no 404)
// una vez aprobado, porque en ese caso ya aparece directo en /jugadores
export async function getMyCfnRegistration(
  token: string,
): Promise<CFNRegistration | null> {
  const res = await fetch(`${API_URL}/cfn/register/me`, {
    headers: authHeaders(token),
  });
  return parseOrThrow<CFNRegistration | null>(res);
}

// solo staff (backend valida is_staff)
export async function listPendingCfnRegistrations(
  token: string,
): Promise<CFNRegistrationPending[]> {
  const res = await fetch(`${API_URL}/cfn/registrations/pending`, {
    headers: authHeaders(token),
  });
  return parseOrThrow<CFNRegistrationPending[]>(res);
}

export async function approveCfnRegistration(
  token: string,
  id: string,
  decision: { display_name?: string; is_tdf: boolean; liquipedia_url?: string },
): Promise<CFNRegistration> {
  const res = await fetch(`${API_URL}/cfn/registrations/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(decision),
  });
  return parseOrThrow<CFNRegistration>(res);
}

export async function rejectCfnRegistration(
  token: string,
  id: string,
): Promise<CFNRegistration> {
  const res = await fetch(`${API_URL}/cfn/registrations/${id}/reject`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseOrThrow<CFNRegistration>(res);
}

export async function getMatchStats(
  cfnId: string,
  days: number,
): Promise<CFNMatchStats> {
  const res = await fetch(
    `${API_URL}/cfn/players/${cfnId}/matches?days=${days}`,
  );
  return parseOrThrow<CFNMatchStats>(res);
}

export async function getRecentMatches(
  cfnId: string,
  days: number,
): Promise<CFNMatchRead[]> {
  const res = await fetch(
    `${API_URL}/cfn/players/${cfnId}/matches/recent?days=${days}&limit=30`,
  );
  return parseOrThrow<CFNMatchRead[]>(res);
}

// cruces entre gente trackeada por TDF en las últimas 24 horas —
// deduplicado por par en el backend, ver GET /cfn/encounters/recent
export async function getRecentEncounters(): Promise<EncounterData[]> {
  const res = await fetch(`${API_URL}/cfn/encounters/recent`);
  return parseOrThrow<EncounterData[]>(res);
}

export async function listTierListTemplates(): Promise<
  TierListTemplateSummaryData[]
> {
  const res = await fetch(`${API_URL}/tierlist-templates`);
  return parseOrThrow<TierListTemplateSummaryData[]>(res);
}

export async function getTierListTemplate(
  id: string,
): Promise<TierListTemplateData> {
  const res = await fetch(`${API_URL}/tierlist-templates/${id}`);
  return parseOrThrow<TierListTemplateData>(res);
}

export async function createTierListTemplate(
  name: string,
  items: TierItemData[],
  token: string,
): Promise<TierListTemplateData> {
  const res = await fetch(`${API_URL}/tierlist-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ name, items }),
  });
  return parseOrThrow<TierListTemplateData>(res);
}

// solo staff (backend valida is_staff, ver require_staff en deps.py) —
// borra la plantilla; los rankings ya guardados que la usaban no se
// rompen, el backend les desvincula template_id en vez de tocarlos
export async function deleteTierListTemplate(
  token: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/tierlist-templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok)
    throw new Error(`No se pudo borrar la plantilla (${res.status})`);
}

// borra UN ítem puntual de una plantilla ya guardada (no la plantilla
// entera) — permitido a quien la creó o a staff, el backend valida cuál
// de los dos caso a caso
export async function deleteTierListTemplateItem(
  token: string,
  templateId: string,
  itemId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/tierlist-templates/${templateId}/items/${itemId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(`No se pudo borrar el ítem (${res.status})`);
}

export async function createTierList(
  templateId: string,
  tiers: Record<string, string[]>,
  tierMeta: TierMetaData[],
  labelWidth: number,
  creatorName?: string,
  token?: string | null,
): Promise<TierListData> {
  const res = await fetch(`${API_URL}/tierlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // con sesión: el backend identifica al usuario por este header y
      // usa su display_name real, ignorando creator_name por completo.
      // Sin esto, el backend nunca ve el token y trata a todo el mundo
      // como invitado aunque esté logueado.
      ...authHeaders(token ?? null),
    },
    body: JSON.stringify({
      template_id: templateId,
      tiers,
      tier_meta: tierMeta,
      label_width: labelWidth,
      creator_name: creatorName,
    }),
  });
  return parseOrThrow<TierListData>(res);
}

export async function getTierList(id: string): Promise<TierListData> {
  const res = await fetch(`${API_URL}/tierlists/${id}`);
  return parseOrThrow<TierListData>(res);
}

// puede borrarla quien la creó (si la guardó logueado) o cualquier
// staff — el backend valida cuál de los dos caso a caso. Las guardadas
// por invitados sin sesión (created_by null) solo las borra staff.
export async function deleteTierList(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/tierlists/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok)
    throw new Error(`No se pudo borrar la tier list (${res.status})`);
}

// galería pública de tier lists YA ARMADAS por la comunidad (no
// plantillas en blanco, ver listTierListTemplates para eso)
export async function listTierLists(): Promise<TierListSummaryData[]> {
  const res = await fetch(`${API_URL}/tierlists`);
  return parseOrThrow<TierListSummaryData[]>(res);
}
