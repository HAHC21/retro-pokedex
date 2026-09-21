import { pillStyle } from "../format";

type MarkTogglesProps = {
  caught: boolean;
  shiny: boolean;
  available: boolean | undefined;
  unavailableLabel: string;
  onCaught: () => void;
  onShiny: () => void;
};

export function MarkToggles({ caught, shiny, available, unavailableLabel, onCaught, onShiny }: MarkTogglesProps) {
  if (available === true) {
    return (
      <span className="pk-toggles">
        <button type="button" className="pk-toggle" style={pillStyle(caught, false)} onClick={onCaught}>
          Normal
        </button>
        <button type="button" className="pk-toggle" style={pillStyle(shiny, true)} onClick={onShiny}>
          Shiny
        </button>
      </span>
    );
  }
  if (available === false) {
    return <span className="pk-unavailable">{unavailableLabel}</span>;
  }
  return <span className="pk-unavailable">Checking obtainability…</span>;
}
