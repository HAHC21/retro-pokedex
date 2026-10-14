/** Wire types for /api/auth. */

export type UserRole = "user" | "developer" | "admin";

export type UserResponse = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  role: UserRole | string;
  created_at: string;
  last_login_at: string;
};

export type ProviderStatus = {
  enabled: boolean;
  login_url: string | null;
};

export type AuthProvidersResponse = {
  google: ProviderStatus;
  microsoft: ProviderStatus;
  password: boolean;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type EmailRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type RegisterResponse = {
  ok: boolean;
  email: string;
  message: string;
  confirm_url: string | null;
};

export type LogoutResponse = {
  ok: boolean;
};
