export type UserRole = "user" | "developer" | "admin";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  email_verified?: boolean;
  role?: UserRole | string;
};

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "developer";
}

export type ProviderStatus = {
  enabled: boolean;
  login_url: string | null;
};

export type AuthProviders = {
  google: ProviderStatus;
  microsoft: ProviderStatus;
  password?: boolean;
};

export type RegisterResult = {
  ok: boolean;
  email: string;
  message: string;
  confirm_url: string | null;
};

const DISABLED: AuthProviders = {
  google: { enabled: false, login_url: null },
  microsoft: { enabled: false, login_url: null },
  password: true,
};

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

export async function fetchProviders(): Promise<AuthProviders> {
  try {
    const response = await fetch("/api/auth/providers", { credentials: "include" });
    if (!response.ok) {
      return DISABLED;
    }
    return (await response.json()) as AuthProviders;
  } catch {
    return DISABLED;
  }
}

export async function registerWithEmail(email: string, password: string, name?: string): Promise<RegisterResult> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: name || null }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Could not create account.");
  }
  return payload as RegisterResult;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Could not log in.");
  }
  return payload as AuthUser;
}

export async function resendConfirmation(email: string): Promise<RegisterResult> {
  const response = await fetch("/api/auth/resend-confirmation", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Could not resend confirmation.");
  }
  return payload as RegisterResult;
}

export async function requestPasswordReset(email: string): Promise<RegisterResult> {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Could not start password reset.");
  }
  return payload as RegisterResult;
}

export async function resetPassword(token: string, password: string): Promise<AuthUser> {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Could not reset password.");
  }
  return payload as AuthUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
