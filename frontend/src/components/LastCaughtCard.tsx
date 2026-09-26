import { boxClass } from "../rarity";
import { dexNum, whenText } from "../format";
import { getMessages } from "../i18n/runtime";
import type { SpeciesRarity } from "../types";
import { Blueprint } from "./Blueprint";
import { GameKeyTag } from "./GameTag";
import { PokemonSprite } from "./PokemonSprite";

type LastCaughtCardProps = {
  id: number;
  name: string;
  rarity?: SpeciesRarity;
  spriteId: number;
  formName: string | null;
  kind: "Normal" | "Shiny";
  game: string;
  at: number;
  onOpen: () => void;
};

export function LastCaughtCard({
  id,
  name,
  rarity,
  spriteId,
  formName,
  kind,
  game,
  at,
  onOpen,
}: LastCaughtCardProps) {
  const marks = getMessages().marks;
  return (
    <Blueprint className={boxClass("pk-mon pk-recent", true, rarity)}>
      <button type="button" className="pk-nav pk-recent-open" onClick={onOpen}>
        <span className="pk-recent-identity">
          <span className="pk-mon-top">
            <span>{dexNum(id)}</span>
          </span>
          <PokemonSprite
            pokemonId={spriteId}
            shiny={kind === "Shiny"}
            formName={formName}
            alt={name}
            loading="lazy"
            className="pk-mon-sprite"
          />
          <span className="pk-recent-copy">
            <span className="pk-name">{name}</span>
          </span>
        </span>
        <span className="pk-recent-meta">
          <GameKeyTag gameKey={game} />
          <span className="pk-mon-mark">{kind === "Shiny" ? marks.shiny : marks.normal}</span>
          <span className="pk-when">{whenText(at)}</span>
        </span>
      </button>
    </Blueprint>
  );
}
