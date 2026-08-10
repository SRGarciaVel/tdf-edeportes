import type { EventFormValues, EventItem, QuarterlyGoal, User } from "./types";

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
  state: string
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
  payload: EventFormValues
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
  payload: Partial<EventFormValues>
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
