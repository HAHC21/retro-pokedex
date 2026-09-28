import { useI18n } from "../i18n/context";
import { LogoPokeBall } from "./LogoPokeBall";

type WordmarkProps = {
  onClick: () => void;
};

export function Wordmark({ onClick }: WordmarkProps) {
  const { messages: m } = useI18n();
  return (
    <button type="button" className="pk-logo" aria-label={m.auth.home} onClick={onClick}>
      <span className="pk-wordmark" aria-hidden="true">
        <span className="pk-word pk-word-retro">Retro</span>
        <span className="pk-word pk-word-pokedex">
          <span>P</span>
          <LogoPokeBall />
          <span>kedex</span>
        </span>
      </span>
    </button>
  );
}
