import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GAMES } from "../catalog";
import type { AuthUser } from "../auth";
import { navBtnStyle } from "../format";
import type { View } from "../types";
import type { ListView } from "../paths";
import { LegalFooter } from "./LegalFooter";
import { Wordmark } from "./Wordmark";

type AppShellProps = {
  game: string;
  view: View;
  authUser: AuthUser | null;
  onGame: (game: string) => void;
  onDash: () => void;
  onDex: () => void;
  onChecklist: () => void;
  listView?: ListView;
  onSignIn: () => void;
  onLogIn: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  game,
  view,
  authUser,
  onGame,
  onDash,
  onDex,
  onChecklist,
  listView = "dex",
  onSignIn,
  onLogIn,
  onLogout,
  children,
}: AppShellProps) {
  const dexActive = view === "dex" || (view === "mon" && listView !== "checklist");
  const checklistActive = view === "checklist" || (view === "mon" && listView === "checklist");
  const showGamePicker = view !== "signin" && view !== "login";
  return (
    <div className="pk-app">
      <header className="nav pk-header">
        <Wordmark onClick={onDash} />
        <div className="pk-header-tools">
          <span className="pk-header-nav">
            <button type="button" className="btn pk-nav" style={navBtnStyle(view === "dash")} onClick={onDash}>
              Dashboard
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(dexActive)} onClick={onDex}>
              Pokédex
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(checklistActive)} onClick={onChecklist}>
              Checklist
            </button>
          </span>
          <span className="pk-header-nav pk-header-auth">
            {authUser ? (
              <ProfileMenu user={authUser} onLogout={onLogout} />
            ) : (
              <>
                <button type="button" className="btn pk-nav" style={navBtnStyle(view === "signin")} onClick={onSignIn}>
                  Sign In
                </button>
                <button type="button" className="btn pk-nav" style={navBtnStyle(view === "login")} onClick={onLogIn}>
                  Log In
                </button>
              </>
            )}
          </span>
        </div>
      </header>
      {showGamePicker ? (
        <div className="pk-game-picker">
          <label className="pk-game-label">
            <span>Game</span>
            <select className="input" value={game} onChange={(event) => onGame(event.target.value)}>
              {GAMES.map((entry) => (
                <option key={entry.k} value={entry.k}>
                  {entry.l}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <main className="pk-main">{children}</main>
      <LegalFooter />
    </div>
  );
}

function ProfileMenu({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = user.name?.trim() || user.email?.split("@")[0] || "Profile";

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="pk-profile" ref={rootRef}>
      <button
        type="button"
        className="btn pk-nav pk-profile-trigger"
        style={navBtnStyle(open)}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <div className="pk-profile-menu" id={menuId} role="menu">
          <div className="pk-profile-meta">
            <strong>{user.name?.trim() || "Trainer"}</strong>
            {user.email ? <span>{user.email}</span> : null}
            {user.role && user.role !== "user" ? <span className="pk-profile-role">{user.role}</span> : null}
          </div>
          <button
            type="button"
            className="btn pk-nav pk-profile-logout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
