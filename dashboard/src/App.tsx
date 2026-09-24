import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminOverview, LoginEvent, SessionUser, fetchMe, fetchOverview, login, logout } from "./api";

function isStaff(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "developer";
}

function displayName(user: SessionUser): string {
  return user.name || user.email || "Account";
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) {
      return;
    }
    const path = window.location.pathname;
    if (!user && path !== "/login") {
      window.history.replaceState({}, "", "/login");
    }
    if (user && path === "/login") {
      window.history.replaceState({}, "", "/");
    }
  }, [loading, user]);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(async (session) => {
        if (cancelled) {
          return;
        }
        if (session && !isStaff(session)) {
          await logout();
          setUser(null);
          setError("Only admins and developers can log in.");
          return;
        }
        setUser(session);
        if (isStaff(session)) {
          setOverview(await fetchOverview());
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not reach the API");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await login(email, password);
      setUser(session);
      setPassword("");
      setOverview(isStaff(session) ? await fetchOverview() : null);
      window.history.replaceState({}, "", "/");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Log in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await logout();
    setUser(null);
    setOverview(null);
    setQuery("");
    window.history.replaceState({}, "", "/login");
  }

  const filteredLogins = useMemo(() => {
    const events = overview?.recent_logins ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return events;
    }
    return events.filter((event) =>
      `${event.email ?? ""} ${event.method} ${event.user_id}`.toLowerCase().includes(needle),
    );
  }, [overview, query]);

  if (loading) {
    return (
      <div className="login-screen">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        email={email}
        password={password}
        error={error}
        onEmail={setEmail}
        onPassword={setPassword}
        onSubmit={onLogin}
      />
    );
  }

  return (
    <div className="canvas">
      <div className="shell">
        <IconRail />
        <SideNav />
        <div className="workspace">
          <TopBar query={query} onQuery={setQuery} user={user} onLogout={onLogout} />
          <div className="content">
            {error ? <p className="error">{error}</p> : null}
            {!overview ? <StaffNotice user={user} /> : null}
            {overview ? <OverviewPanel overview={overview} logins={filteredLogins} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconRail() {
  return (
    <aside className="rail" aria-label="Primary">
      <span className="brand-mark" aria-hidden="true">
        <DexMark />
      </span>
      <nav>
        <button type="button" className="rail-btn is-active" aria-label="Overview" title="Overview">
          <HomeIcon />
        </button>
        <button type="button" className="rail-btn" aria-label="Sign-ins" title="Sign-ins">
          <UsersIcon />
        </button>
      </nav>
    </aside>
  );
}

function SideNav() {
  return (
    <aside className="sidenav">
      <p className="product">Admin</p>
      <nav>
        <a className="nav-item is-active" href="#overview">
          <GridIcon /> Overview
        </a>
        <a className="nav-item" href="#sign-ins">
          <UsersIcon /> Sign-ins
        </a>
      </nav>
    </aside>
  );
}

function TopBar({
  query,
  onQuery,
  user,
  onLogout,
}: {
  query: string;
  onQuery: (value: string) => void;
  user: SessionUser;
  onLogout: () => void;
}) {
  const today = new Date().toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  return (
    <header className="topbar">
      <label className="search">
        <SearchIcon />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search sign-ins..."
          aria-label="Search sign-ins"
        />
      </label>
      <div className="topbar-actions">
        <span className="date-pill">{today}</span>
        <button type="button" className="primary" onClick={onLogout}>
          Log out
        </button>
        <Profile user={user} />
      </div>
    </header>
  );
}

function Profile({ user }: { user: SessionUser }) {
  const name = displayName(user);
  const role = user.role;
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="profile">
      <span className="avatar" aria-hidden="true">
        {initial}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{role}</small>
      </span>
    </div>
  );
}

function LoginPage({
  email,
  password,
  error,
  onEmail,
  onPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string | null;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="login-screen">
      <section className="panel login-panel">
        <p className="product">Admin</p>
        <h1>Log in</h1>
        <p className="muted">Admin and developer accounts can view site stats.</p>
        {error ? <p className="error">{error}</p> : null}
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => onEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary">
            Log in
          </button>
        </form>
      </section>
    </div>
  );
}

function StaffNotice({ user }: { user: SessionUser }) {
  return (
    <section className="panel">
      <h1>Overview</h1>
      <p className="muted">
        {displayName(user)} is logged in as {user.role}. Stats are limited to admin and developer accounts.
      </p>
    </section>
  );
}

function OverviewPanel({ overview, logins }: { overview: AdminOverview; logins: LoginEvent[] }) {
  return (
    <>
      <div className="page-head" id="overview">
        <h1>Site statistics</h1>
        <div className="tabs" role="tablist">
          <span className="tab is-active">Overview</span>
        </div>
      </div>
      <section className="stat-row">
        <StatCard label="Users" value={overview.user_count} note="Accounts" tone="neutral" />
        <StatCard label="Logins today" value={overview.logins_today} note="UTC day" tone="blue" />
        <StatCard label="Last 7 days" value={overview.logins_last_7_days} note="Rolling" tone="green" />
        <StatCard label="Shown" value={overview.recent_logins.length} note="Latest events" tone="amber" />
      </section>
      <section className="split">
        <article className="panel chart-card">
          <div className="panel-head">
            <h2>Sign-ins</h2>
            <span className="legend">
              <i className="swatch" /> Recent
            </span>
          </div>
          <LoginChart events={overview.recent_logins} />
        </article>
        <div className="mini-grid">
          <MiniStat label="Password" value={countMethod(overview.recent_logins, "password")} />
          <MiniStat label="Google" value={countMethod(overview.recent_logins, "google")} />
          <MiniStat label="Microsoft" value={countMethod(overview.recent_logins, "microsoft")} />
          <MiniStat label="Other" value={countOther(overview.recent_logins)} />
        </div>
      </section>
      <section className="panel table-card" id="sign-ins">
        <div className="panel-head">
          <h2>Recent sign-ins</h2>
        </div>
        {logins.length === 0 ? (
          <p className="muted empty">No sign-ins recorded yet. New logins are stored as they happen.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Email</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((event) => (
                <tr key={event.event_id}>
                  <td>{formatWhen(event.occurred_at)}</td>
                  <td>{event.email ?? event.user_id}</td>
                  <td>
                    <span className="tag">{event.method}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone: "neutral" | "blue" | "green" | "amber";
}) {
  return (
    <article className="panel stat">
      <h2>{label}</h2>
      <p className="stat-value">{value}</p>
      <p className={`note note-${tone}`}>{note}</p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <article className="panel mini">
      <h2>{label}</h2>
      <p className="stat-value">{value}</p>
    </article>
  );
}

function LoginChart({ events }: { events: LoginEvent[] }) {
  const buckets = new Map<string, number>();
  for (const event of [...events].reverse()) {
    const key = dayKey(event.occurred_at);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const rows = [...buckets.entries()].slice(-6);
  const max = Math.max(1, ...rows.map(([, count]) => count));
  if (rows.length === 0) {
    return <p className="muted empty">Sign-ins will appear here after the next login.</p>;
  }
  return (
    <div className="bars" role="img" aria-label="Recent sign-ins by day">
      {rows.map(([label, count]) => (
        <div className="bar-col" key={label}>
          <div className="bar-track">
            <span style={{ height: `${Math.round((count / max) * 100)}%` }} />
          </div>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

function countMethod(events: LoginEvent[], method: string): number {
  return events.filter((event) => event.method === method).length;
}

function countOther(events: LoginEvent[]): number {
  return events.filter((event) => !["password", "google", "microsoft"].includes(event.method)).length;
}

function DexMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="3" />
      <path d="M4 19c.6-2.6 2.5-4 5-4s4.4 1.4 5 4" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M16 15.2c1.8.2 3.2 1.3 3.8 3.3" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}
