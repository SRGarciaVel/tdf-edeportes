import type { User } from "./types";

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
