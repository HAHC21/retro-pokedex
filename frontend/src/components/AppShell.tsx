import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GAMES } from "../catalog";
import type { AuthUser } from "../auth";
import { navBtnStyle } from "../format";
import { useI18n } from "../i18n/context";
import type { Locale } from "../i18n/runtime";
import { gameLabel } from "../progress";
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
  onCollection: () => void;
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
  onCollection,
  onChecklist,
  listView = "dex",
  onSignIn,
  onLogIn,
  onLogout,
  children,
}: AppShellProps) {
  const { locale, setLocale, messages: m } = useI18n();
  const dexActive = view === "dex" || (view === "mon" && listView === "dex");
  const collectionActive = view === "collection" || (view === "mon" && listView === "collection");
  const checklistActive = view === "checklist" || (view === "mon" && listView === "checklist");
  const showGamePicker = view !== "signin" && view !== "login" && view !== "changelog" && view !== "roadmap" && view !== "collection";
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
              {m.nav.dashboard}
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(dexActive)} onClick={onDex}>
              {m.nav.pokedex}
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(collectionActive)} onClick={onCollection}>
              {m.nav.collection}
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(checklistActive)} onClick={onChecklist}>
              {m.nav.checklist}
            </button>
          </span>
          <span className="pk-header-nav pk-header-auth pk-header-nav-desktop">
            {authUser ? (
              <ProfileMenu user={authUser} onLogout={onLogout} />
            ) : (
              <>
                <button type="button" className="btn pk-nav" style={navBtnStyle(view === "signin")} onClick={onSignIn}>
                  {m.nav.signIn}
                </button>
                <button type="button" className="btn pk-nav" style={navBtnStyle(view === "login")} onClick={onLogIn}>
                  {m.nav.logIn}
                </button>
              </>
            )}
          </span>
          <LanguageSwitch locale={locale} onChange={setLocale} label={m.lang.group} enLabel={m.lang.en} esLabel={m.lang.es} english={m.lang.english} spanish={m.lang.spanish} />

          <div className="pk-header-menu" ref={menuRef}>
            <button
              type="button"
              className="btn pk-nav pk-hamburger"
              style={navBtnStyle(menuOpen)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? m.nav.closeMenu : m.nav.openMenu}
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
                  {m.nav.dashboard}
                </button>
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(dexActive)}
                  onClick={() => go(onDex)}
                >
                  {m.nav.pokedex}
                </button>
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(collectionActive)}
                  onClick={() => go(onCollection)}
                >
                  {m.nav.collection}
                </button>
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(checklistActive)}
                  onClick={() => go(onChecklist)}
                >
                  {m.nav.checklist}
                </button>
                <div className="pk-header-menu-divider" />
                {authUser ? (
                  <>
                    <div className="pk-profile-meta">
                      <strong>{authUser.name?.trim() || m.nav.trainer}</strong>
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
                      {m.nav.logOut}
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
                      {m.nav.signIn}
                    </button>
                    <button
                      type="button"
                      className="btn pk-nav"
                      role="menuitem"
                      style={navBtnStyle(view === "login")}
                      onClick={() => go(onLogIn)}
                    >
                      {m.nav.logIn}
                    </button>
                  </>
                )}
                <div className="pk-header-menu-divider" />
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(locale === "en")}
                  aria-pressed={locale === "en"}
                  onClick={() => go(() => setLocale("en"))}
                >
                  {m.lang.english}
                </button>
                <button
                  type="button"
                  className="btn pk-nav"
                  role="menuitem"
                  style={navBtnStyle(locale === "es")}
                  aria-pressed={locale === "es"}
                  onClick={() => go(() => setLocale("es"))}
                >
                  {m.lang.spanish}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {showGamePicker ? (
        <div className="pk-game-picker">
          <label className="pk-game-label">
            <span className="pk-game-label-row">
              <span>{m.game.label}</span>
              <InfoTip label={m.game.about} wide>
                <p>{m.game.body}</p>
                <p>{m.game.global}</p>
              </InfoTip>
            </span>
            <select className="input" value={game} onChange={(event) => onGame(event.target.value)}>
              {GAMES.map((entry) => (
                <option key={entry.k} value={entry.k}>
                  {gameLabel(entry.k)}
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
  const { messages: m } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = user.name?.trim() || user.email?.split("@")[0] || m.nav.profile;

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
            <strong>{user.name?.trim() || m.nav.trainer}</strong>
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
            {m.nav.logOut}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LanguageSwitch({
  locale,
  onChange,
  label,
  enLabel,
  esLabel,
  english,
  spanish,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  label: string;
  enLabel: string;
  esLabel: string;
  english: string;
  spanish: string;
}) {
  return (
    <span className="pk-header-lang" role="group" aria-label={label}>
      <button
        type="button"
        className="btn pk-nav pk-lang"
        style={navBtnStyle(locale === "en")}
        aria-pressed={locale === "en"}
        aria-label={english}
        onClick={() => onChange("en")}
      >
        {enLabel}
      </button>
      <button
        type="button"
        className="btn pk-nav pk-lang"
        style={navBtnStyle(locale === "es")}
        aria-pressed={locale === "es"}
        aria-label={spanish}
        onClick={() => onChange("es")}
      >
        {esLabel}
      </button>
    </span>
  );
}
