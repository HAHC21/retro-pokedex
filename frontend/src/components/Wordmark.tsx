import retroPokedexMark from "../assets/type-icons/retro_pokedex.png";
import { useI18n } from "../i18n/context";

type WordmarkProps = {
  onClick: () => void;
};

export function Wordmark({ onClick }: WordmarkProps) {
  const { messages: m } = useI18n();
  return (
    <button type="button" className="pk-logo pk-logo--image" aria-label={m.auth.home} onClick={onClick}>
      <img className="pk-logo-img" src={retroPokedexMark} alt="" />
      <span className="pk-wordmark">
        <span className="pk-word pk-word-hollow">Retro</span>
        <span className="pk-word-solid">Pokédex</span>
      </span>
    </button>
  );
}
