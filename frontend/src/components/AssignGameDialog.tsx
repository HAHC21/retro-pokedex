import { useEffect, useState } from "react";
import { GAMES, GENS } from "../catalog";
import { navBtnStyle } from "../format";
import { gameLabel } from "../progress";
import { GameKeyTag } from "./GameTag";
import { Modal } from "./Modal";

type AssignGameDialogProps = {
  open: boolean;
  name: string;
  fromGame: string | null;
  recordedGames: string[];
  onClose: () => void;
  onApply: (fromGame: string, toGame: string) => void;
};

const columns = [
  { label: "Collection", games: GAMES.filter((game) => game.g === 0) },
  ...GENS.map((gen) => ({
    label: `Gen ${gen.roman}`,
    games: GAMES.filter((game) => game.g === gen.id),
  })),
].filter((column) => column.games.length > 0);

export function AssignGameDialog({ open, name, fromGame, recordedGames, onClose, onApply }: AssignGameDialogProps) {
  const [selected, setSelected] = useState(fromGame ?? "");

  useEffect(() => {
    setSelected(fromGame ?? "");
  }, [fromGame, open]);

  const unchanged = !fromGame || selected === fromGame;
  const combines = !!selected && selected !== fromGame && recordedGames.includes(selected);

  return (
    <Modal open={open && !!fromGame} title={`Move ${name}`} onClose={onClose} size="wide">
      <p className="pk-assign-note">
        Currently recorded in {fromGame ? gameLabel(fromGame) : "this game"}. Choose the game this mark should use.
      </p>
      <div className="pk-game-columns pk-assign-columns">
        {columns.map((column) => (
          <div key={column.label} className="pk-game-column">
            <span className="pk-game-column-gen">{column.label}</span>
            <div className="pk-game-column-tags">
              {column.games.map((game) => {
                const active = game.k === selected;
                return (
                  <button
                    key={game.k}
                    type="button"
                    className={active ? "pk-assign-game is-selected" : "pk-assign-game"}
                    aria-pressed={active}
                    onClick={() => setSelected(game.k)}
                  >
                    <GameKeyTag gameKey={game.k} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {combines ? (
        <p className="pk-assign-note">This Pokémon is already recorded in {gameLabel(selected)}. Both marks stay together.</p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="btn pk-nav" style={navBtnStyle(false)} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn pk-nav"
          style={navBtnStyle(!unchanged)}
          disabled={unchanged}
          onClick={() => {
            if (fromGame && !unchanged) {
              onApply(fromGame, selected);
            }
          }}
        >
          Apply
        </button>
      </div>
    </Modal>
  );
}
