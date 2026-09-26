import { Link } from "react-router-dom";
import { useI18n } from "../i18n/context";

export function LegalFooter() {
  const { messages: m } = useI18n();
  return (
    <footer className="pk-footer">
      <p className="pk-footer-links">
        <Link to="/changelog">{m.footer.changelog}</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/roadmap">{m.footer.roadmap}</Link>
      </p>
      <p className="pk-footer-legal">{m.footer.legal}</p>
      <p className="pk-footer-credit">
        {m.footer.data}{" "}
        <a href="https://pokeapi.co/" rel="noopener noreferrer" target="_blank">
          PokéAPI
        </a>
      </p>
    </footer>
  );
}
