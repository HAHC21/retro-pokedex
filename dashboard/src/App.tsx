import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminOverview, SessionUser, fetchMe, fetchOverview, login, logout } from "./api";
import { AcquisitionBoard, ActivityBoard, OverviewBoard, SignInBoard } from "./stats";

type BoardId = "overview" | "activity" | "acquisition" | "sign-ins";

const BOARDS: { id: BoardId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "acquisition", label: "Acquisition" },
  { id: "sign-ins", label: "Sign-ins" },
];

function isStaff(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "developer";
}

function displayName(user: SessionUser): string {
  return user.name || user.email || "Account";
}

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [board, setBoard] = useState<BoardId>("overview");
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
    setBoard("overview");
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
        <IconRail board={board} onBoard={setBoard} />
        <SideNav board={board} onBoard={setBoard} />
        <div className="workspace">
          <TopBar
            query={query}
            onQuery={setQuery}
            showSearch={board === "sign-ins"}
            user={user}
            onLogout={onLogout}
          />
          <div className="content">
            {error ? <p className="error">{error}</p> : null}
            {!overview ? <StaffNotice user={user} /> : null}
            {overview && board === "overview" ? (
              <OverviewBoard activity={overview.activity} google={overview.google} />
            ) : null}
            {overview && board === "activity" ? <ActivityBoard activity={overview.activity} /> : null}
            {overview && board === "acquisition" ? <AcquisitionBoard google={overview.google} /> : null}
            {overview && board === "sign-ins" ? (
              <SignInBoard
                userCount={overview.user_count}
                loginsToday={overview.logins_today}
                loginsWeek={overview.logins_last_7_days}
                logins={filteredLogins}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconRail({ board, onBoard }: { board: BoardId; onBoard: (board: BoardId) => void }) {
  return (
    <aside className="rail" aria-label="Primary">
      <span className="brand-mark" aria-hidden="true">
        <DexMark />
      </span>
      <nav>
        {BOARDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === board ? "rail-btn is-active" : "rail-btn"}
            aria-label={item.label}
            aria-current={item.id === board ? "page" : undefined}
            title={item.label}
            onClick={() => onBoard(item.id)}
          >
            <BoardIcon id={item.id} />
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SideNav({ board, onBoard }: { board: BoardId; onBoard: (board: BoardId) => void }) {
  return (
    <aside className="sidenav">
      <p className="product">Admin</p>
      <nav>
        {BOARDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === board ? "nav-item is-active" : "nav-item"}
            aria-current={item.id === board ? "page" : undefined}
            onClick={() => onBoard(item.id)}
          >
            <BoardIcon id={item.id} size={16} />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({
  query,
  onQuery,
  showSearch,
  user,
  onLogout,
}: {
  query: string;
  onQuery: (value: string) => void;
  showSearch: boolean;
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
      {showSearch ? (
        <label className="search">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search sign-ins..."
            aria-label="Search sign-ins"
          />
        </label>
      ) : (
        <span className="topbar-title">Site statistics</span>
      )}
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
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="profile">
      <span className="avatar" aria-hidden="true">
        {initial}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{user.role}</small>
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

function BoardIcon({ id, size = 18 }: { id: BoardId; size?: number }) {
  if (id === "overview") {
    return <GridIcon size={size} />;
  }
  if (id === "activity") {
    return <UsersIcon size={size} />;
  }
  if (id === "acquisition") {
    return <ChartIcon size={size} />;
  }
  return <RowsIcon size={size} />;
}

function DexMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function UsersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="3" />
      <path d="M4 19c.6-2.6 2.5-4 5-4s4.4 1.4 5 4" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M16 15.2c1.8.2 3.2 1.3 3.8 3.3" />
    </svg>
  );
}

function GridIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l3.5-4 2.5 2.5L19 8" />
    </svg>
  );
}

function RowsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 7h14M5 12h14M5 17h14" />
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
