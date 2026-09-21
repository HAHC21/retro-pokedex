import retroPokedexMark from "../assets/type-icons/retro_pokedex.png";

type WordmarkProps = {
  onClick: () => void;
};

export function Wordmark({ onClick }: WordmarkProps) {
  return (
    <button type="button" className="pk-logo pk-logo--image" aria-label="Retro Pokédex home" onClick={onClick}>
      <img className="pk-logo-img" src={retroPokedexMark} alt="" />
      <span className="pk-wordmark">
        <span className="pk-word pk-word-hollow">Retro</span>
        <span className="pk-word-solid">Pokédex</span>
      </span>
    </button>
  );
}
