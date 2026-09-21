import { FormEvent, useEffect, useState } from "react";
import { Blueprint } from "../components/Blueprint";
import {
  fetchProviders,
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
  resendConfirmation,
  resetPassword,
  type AuthProviders,
} from "../auth";
import { useSearchParams } from "react-router-dom";

type AuthViewProps = {
  mode: "signin" | "login";
  error?: string | null;
  onAlt: () => void;
  onContinue: () => void;
};

const COPY: Record<
  "signin" | "login",
  { kicker: string; title: string; body: string; google: string; microsoft: string; submit: string; altText: string; altLabel: string }
> = {
  signin: {
    kicker: "New trainer",
    title: "Sign in",
    body: "Create an account to sync your marks across devices.",
    google: "Sign in with Google",
    microsoft: "Sign in with Microsoft",
    submit: "Create account",
    altText: "Already registered?",
    altLabel: "Log in",
  },
  login: {
    kicker: "Welcome back",
    title: "Log in",
    body: "Pick up your collection on any device.",
    google: "Log in with Google",
    microsoft: "Log in with Microsoft",
    submit: "Log in",
    altText: "No account yet?",
    altLabel: "Sign in",
  },
};

export function AuthView({ mode, error, onAlt, onContinue }: AuthViewProps) {
  const copy = COPY[mode];
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get("reset_token");
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [notice, setNotice] = useState<string | null>(error || null);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotice(error || null);
    setConfirmUrl(null);
  }, [error, mode]);

  useEffect(() => {
    let cancelled = false;
    fetchProviders().then((next) => {
      if (!cancelled) {
        setProviders(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function startOAuth(provider: "google" | "microsoft") {
    const url = providers?.[provider]?.login_url;
    if (!url) {
      setNotice(`${provider === "google" ? "Google" : "Microsoft"} sign-in is not configured yet.`);
      return;
    }
    window.location.assign(url);
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      setNotice("Enter your email above, then click Forgot password.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setConfirmUrl(null);
    try {
      const result = await requestPasswordReset(email);
      setNotice(result.message);
      setConfirmUrl(result.confirm_url);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not start password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setConfirmUrl(null);
    try {
      if (resetToken && mode === "login") {
        await resetPassword(resetToken, password);
        setSearchParams({}, { replace: true });
        onContinue();
      } else if (mode === "signin") {
        const result = await registerWithEmail(email, password);
        setNotice(result.message);
        setConfirmUrl(result.confirm_url);
      } else {
        await loginWithEmail(email, password);
        onContinue();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setNotice(message);
      if (mode === "login" && !resetToken && /confirm your email/i.test(message)) {
        try {
          const resent = await resendConfirmation(email);
          if (resent.confirm_url) {
            setConfirmUrl(resent.confirm_url);
            setNotice(`${message} A new link is ready below.`);
          }
        } catch {
          /* keep original notice */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const resetting = Boolean(resetToken && mode === "login");

  return (
    <div className="pk-page pk-auth">
      <Blueprint className="pk-auth-card">
        <div className="pk-auth-intro">
          <span className="pk-kicker">{resetting ? "Password reset" : copy.kicker}</span>
          <h1>{resetting ? "Choose a new password" : copy.title}</h1>
          <p>{resetting ? "Enter a new password for your account." : copy.body}</p>
        </div>

        {!resetting ? (
          <div className="pk-auth-providers">
            <button type="button" className="btn pk-nav pk-auth-provider" onClick={() => startOAuth("google")}>
              <GoogleMark />
              {copy.google}
            </button>
            <button type="button" className="btn pk-nav pk-auth-provider" onClick={() => startOAuth("microsoft")}>
              <MicrosoftMark />
              {copy.microsoft}
            </button>
          </div>
        ) : null}

        {!resetting ? (
          <div className="pk-auth-rule">
            <span />
            <span>or with email</span>
            <span />
          </div>
        ) : null}

        <form className="pk-auth-form" onSubmit={onEmail}>
          {!resetting ? (
            <label className="field pk-field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                placeholder="trainer@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="field pk-field">
            <span>{resetting ? "New password" : "Password"}</span>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="btn pk-nav pk-auth-submit" disabled={busy}>
            {busy ? "Please wait…" : resetting ? "Save new password" : copy.submit}
          </button>
        </form>

        {mode === "login" && !resetting ? (
          <button type="button" className="btn btn-ghost pk-nav" disabled={busy} onClick={() => void onForgotPassword()}>
            Forgot password?
          </button>
        ) : null}

        {notice ? <p className="pk-auth-notice">{notice}</p> : null}
        {confirmUrl ? (
          <p className="pk-auth-notice">
            Link (dev / console mail):{" "}
            <a href={confirmUrl} className="pk-auth-confirm-link">
              Open link
            </a>
          </p>
        ) : null}

        <div className="pk-auth-alt">
          <span>{copy.altText}</span>
          <button type="button" className="btn btn-ghost pk-nav" onClick={onAlt}>
            {copy.altLabel}
          </button>
        </div>

        <button type="button" className="btn btn-ghost pk-nav pk-auth-skip" onClick={onContinue}>
          Continue without an account
        </button>
      </Blueprint>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.2z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 10l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
