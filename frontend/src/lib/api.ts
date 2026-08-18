import type {
  EventFormValues,
  EventItem,
  QuarterlyGoal,
  User,
  CFNProfile,
  CFNMatchStats,
  CFNMatchRead,
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

export async function listCfnPlayers(): Promise<CFNProfile[]> {
  const res = await fetch(`${API_URL}/cfn/players`);
  return parseOrThrow<CFNProfile[]>(res);
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
      creator_name: creatorName,
    }),
  });
  return parseOrThrow<TierListData>(res);
}

export async function getTierList(id: string): Promise<TierListData> {
  const res = await fetch(`${API_URL}/tierlists/${id}`);
  return parseOrThrow<TierListData>(res);
}

// galería pública de tier lists YA ARMADAS por la comunidad (no
// plantillas en blanco, ver listTierListTemplates para eso)
export async function listTierLists(): Promise<TierListSummaryData[]> {
  const res = await fetch(`${API_URL}/tierlists`);
  return parseOrThrow<TierListSummaryData[]>(res);
}
