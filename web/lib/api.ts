// Thin client for the Ground Up API (FastAPI on Render). Token lives in a cookie so proxy.ts can gate routes.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const COOKIE = "gu_token";

export type Profile = {
  sport: string | null; position: string | null; age: number | null; city: string | null; region: string | null;
  level: string | null; skills: string[]; goals: string | null; bio: string | null;
};
export type User = {
  id: string; email: string | null; name: string | null; avatar_url: string | null; role: string; mode: string;
  verification_status: "unverified" | "pending" | "verified" | "rejected"; profile: Profile | null;
};
export type Opportunity = {
  id: string; title: string; org: string; type: string; sport: string; positions: string[]; age_min: number | null;
  age_max: number | null; city: string | null; level: string | null; skills: string[]; description: string | null;
  deadline: string | null; synthetic: boolean;
};
export type Match = { opportunity: Opportunity; score: number; components: Record<string, number>; reasons: string[] };
export type Post = { id: string; body: string; created_at: string; author: { id: string; name: string | null; role: string } };
export type Person = { id: string; name: string | null; position: string | null; city: string | null; role: string };

export function getToken() {
  if (typeof document === "undefined") return null;
  return document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`))?.[1] ?? null;
}

export function setToken(token: string | null) {
  // ponytail: JS-readable cookie + Bearer header keeps web and API on separate hosts simple.
  // Stage 2: same-site api subdomain + httpOnly cookie (see ARCHITECTURE.md).
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = token
    ? `${COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax${secure}`
    : `${COOKIE}=; path=/; max-age=0`;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && token) {
    setToken(null);
    location.href = "/login";
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof body.detail === "string" ? body.detail : "Something went wrong");
  }
  return res.json();
}

export const post = <T>(path: string, body: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(body) });
