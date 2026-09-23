import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GAMES } from "../catalog";
import type { AuthUser } from "../auth";
import { navBtnStyle } from "../format";
import type { View } from "../types";
import type { ListView } from "../paths";
import { LegalFooter } from "./LegalFooter";
import { InfoTip } from "./InfoTip";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [view, game]);

  function go(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <div className="pk-app">
      <header className="nav pk-header">
        <Wordmark onClick={onDash} />
        <div className="pk-header-tools">
          <span className="pk-header-nav pk-header-nav-desktop">
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
          <span className="pk-header-nav pk-header-auth pk-header-nav-desktop">
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

          <div className="pk-header-menu" ref={menuRef}>
            <button
              type="button"
              className="btn pk-nav pk-hamburger"
              style={navBtnStyle(menuOpen)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className={`pk-hamburger-icon${menuOpen ? " is-open" : ""}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            {menuOpen ? (
              <div className="pk-header-menu-panel" id={menuId} role="menu">
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(view === "dash")}
                  onClick={() => go(onDash)}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(dexActive)}
                  onClick={() => go(onDex)}
                >
                  Pokédex
                </button>
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(checklistActive)}
                  onClick={() => go(onChecklist)}
                >
                  Checklist
                </button>
                <div className="pk-header-menu-divider" />
                {authUser ? (
                  <>
                    <div className="pk-profile-meta">
                      <strong>{authUser.name?.trim() || "Trainer"}</strong>
                      {authUser.email ? <span>{authUser.email}</span> : null}
                      {authUser.role && authUser.role !== "user" ? (
                        <span className="pk-profile-role">{authUser.role}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn pk-nav"
                      role="menuitem"
                      onClick={() => go(onLogout)}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn pk-nav"
                      role="menuitem"
                      style={navBtnStyle(view === "signin")}
                      onClick={() => go(onSignIn)}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="btn pk-nav"
                      role="menuitem"
                      style={navBtnStyle(view === "login")}
                      onClick={() => go(onLogIn)}
                    >
                      Log In
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {showGamePicker ? (
        <div className="pk-game-picker">
          <label className="pk-game-label">
            <span className="pk-game-label-row">
              <span>Game</span>
              <InfoTip label="About the game selector" wide>
                <p>
                  Chooses which save you are tracking. Caught/shiny marks, My Specimens, wild spawn maps, and move
                  learnsets are scoped to this game.
                </p>
                <p>
                  <strong>HOME</strong> is the global collection view across every game. Other options (e.g. HeartGold /
                  SoulSilver) represent that specific cartridge or title.
                </p>
              </InfoTip>
            </span>
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
