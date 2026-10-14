/** Signed-in staff account. */

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  role: string;
  created_at: string;
  last_login_at: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};
