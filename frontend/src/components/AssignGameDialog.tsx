import { useEffect, useState } from "react";
import { catchableGameKeys, GAMES, GENS } from "../catalog";
import { navBtnStyle } from "../format";
import { useI18n } from "../i18n/context";
import { fetchMon } from "../pokeapi";
import { gameLabel } from "../progress";
import { GameKeyTag } from "./GameTag";
import { Modal } from "./Modal";

type AssignGameDialogProps = {
  open: boolean;
  name: string;
  pokemonId: number;
  resourceId: number;
  fromGame: string | null;
  recordedGames: string[];
  onClose: () => void;
  onApply: (fromGame: string, toGame: string) => void;
};

export function AssignGameDialog({
  open,
  name,
  pokemonId,
  resourceId,
  fromGame,
  recordedGames,
  onClose,
  onApply,
}: AssignGameDialogProps) {
  const { messages: m, fill } = useI18n();
  const columns = [
    { label: m.assign.collection, games: GAMES.filter((game) => game.g === 0) },
    ...GENS.map((gen) => ({
      label: fill(m.assign.gen, { roman: gen.roman }),
      games: GAMES.filter((game) => game.g === gen.id),
    })),
  ].filter((column) => column.games.length > 0);
  const [selected, setSelected] = useState(fromGame ?? "");
  const [allowed, setAllowed] = useState<Set<string> | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    setSelected(fromGame ?? "");
  }, [fromGame, open]);

  useEffect(() => {
    if (!open) {
      setAllowed(null);
      setCheckFailed(false);
      return;
    }
    let cancelled = false;
    setCheckFailed(false);
    setAllowed(null);
    fetchMon(resourceId)
      .then((mon) => {
        if (cancelled) {
          return;
        }
        const ids = new Set([pokemonId, resourceId]);
        const tradeEvolution = (mon.evo || []).some(
          (step) => ids.has(step.id) && /\btrade\b/i.test(step.cond || ""),
        );
        const keys = catchableGameKeys(mon.games, { tradeEvolution });
        if (fromGame) {
          keys.add(fromGame);
        }
        setAllowed(keys);
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed(null);
          setCheckFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, pokemonId, resourceId, fromGame]);

  const unchanged = !fromGame || selected === fromGame;
  const combines = !!selected && selected !== fromGame && recordedGames.includes(selected);
  const waiting = allowed == null && !checkFailed;
  const visibleColumns = waiting
    ? []
    : columns
        .map((column) => ({
          ...column,
          games: allowed == null ? column.games : column.games.filter((game) => allowed.has(game.k)),
        }))
        .filter((column) => column.games.length > 0);

  return (
    <Modal open={open && !!fromGame} title={fill(m.assign.title, { name })} onClose={onClose} size="wide">
      <p className="pk-assign-note">
        {fill(m.assign.note, { game: fromGame ? gameLabel(fromGame) : m.assign.thisGame, name })}
      </p>
      {waiting ? <p className="pk-assign-note">{fill(m.assign.checking, { name })}</p> : null}
      {checkFailed ? (
        <p className="pk-assign-note">{m.assign.failed}</p>
      ) : null}
      {waiting ? null : (
        <div className="pk-game-columns pk-assign-columns">
          {visibleColumns.map((column) => (
            <div key={column.label} className="pk-game-column">
              <span className="pk-game-column-gen">{column.label}</span>
              <div className="pk-game-column-tags">
                {column.games.map((game) => (
                  <GameKeyTag
                    key={game.k}
                    gameKey={game.k}
                    pressed={game.k === selected}
                    onClick={() => setSelected(game.k)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {combines ? (
        <p className="pk-assign-note">{fill(m.assign.combines, { game: gameLabel(selected) })}</p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="btn pk-nav" style={navBtnStyle(false)} onClick={onClose}>
          {m.assign.cancel}
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
          {m.assign.apply}
        </button>
      </div>
    </Modal>
  );
}
