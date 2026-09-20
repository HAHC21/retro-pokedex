import type { ReactNode } from "react";
import { GAMES } from "../catalog";
import { navBtnStyle } from "../format";
import type { View } from "../types";
import { LegalFooter } from "./LegalFooter";
import { Wordmark } from "./Wordmark";

type AppShellProps = {
  game: string;
  view: View;
  onGame: (game: string) => void;
  onDash: () => void;
  onDex: () => void;
  onSignIn: () => void;
  onLogIn: () => void;
  children: ReactNode;
};

export function AppShell({ game, view, onGame, onDash, onDex, onSignIn, onLogIn, children }: AppShellProps) {
  const dexActive = view === "dex" || view === "mon";
  const showGamePicker = view !== "signin" && view !== "login";
  return (
    <div className="pk-app">
      <header className="nav pk-header">
        <Wordmark />
        <div className="pk-header-tools">
          <span className="pk-header-nav">
            <button type="button" className="btn pk-nav" style={navBtnStyle(view === "dash")} onClick={onDash}>
              Dashboard
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(dexActive)} onClick={onDex}>
              Pokédex
            </button>
          </span>
          <span className="pk-header-nav pk-header-auth">
            <button type="button" className="btn pk-nav" style={navBtnStyle(view === "signin")} onClick={onSignIn}>
              Sign In
            </button>
            <button type="button" className="btn pk-nav" style={navBtnStyle(view === "login")} onClick={onLogIn}>
              Log In
            </button>
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
