import type { LoginRequest, SessionUser } from "./schemas/auth";
import type { AdminOverview } from "./schemas/admin";

export type { LoginRequest, SessionUser } from "./schemas/auth";
export type {
  ActivityDay,
  ActivitySnapshot,
  AdminOverview,
  CountWindow,
  GoogleChannel,
  GoogleInsights,
  LoginEvent,
  RankedMetric,
} from "./schemas/admin";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    return body.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function fetchMe(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SessionUser;
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SessionUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function fetchOverview(): Promise<AdminOverview> {
  const response = await fetch("/api/admin/overview", { credentials: "include" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AdminOverview;
}
