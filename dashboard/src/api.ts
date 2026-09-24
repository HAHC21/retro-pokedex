export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
};

export type LoginEvent = {
  event_id: string;
  user_id: string;
  email: string | null;
  method: string;
  occurred_at: string;
};

export type AdminOverview = {
  user_count: number;
  logins_today: number;
  logins_last_7_days: number;
  recent_logins: LoginEvent[];
};

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
    body: JSON.stringify({ email, password }),
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
