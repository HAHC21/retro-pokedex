import { Link } from "react-router-dom";

export function LegalFooter() {
  return (
    <footer className="pk-footer">
      <p className="pk-footer-links">
        <Link to="/changelog">Changelog</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/roadmap">Roadmap</Link>
      </p>
      <p className="pk-footer-legal">
        Retro Pokédex is an unofficial, fan-made dashboard and is not affiliated with, endorsed, or
        supported by Nintendo, Game Freak, or The Pokémon Company. Pokémon and Pokédex are registered
        trademarks of Nintendo.
      </p>
      <p className="pk-footer-credit">
        Data provided by{" "}
        <a href="https://pokeapi.co/" rel="noopener noreferrer" target="_blank">
          PokéAPI
        </a>
      </p>
    </footer>
  );
}
