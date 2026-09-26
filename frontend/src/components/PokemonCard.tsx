import { useState } from "react";
import { boxClass } from "../rarity";
import type { SpeciesRarity } from "../types";
import { AssignGameDialog } from "./AssignGameDialog";
import { Blueprint } from "./Blueprint";
import { GameKeyTag } from "./GameTag";
import { GenderSprites } from "./GenderSprites";
import { MarkToggles } from "./MarkToggles";
import { PokemonSprite } from "./PokemonSprite";
import { TypeTag } from "./TypeTag";

type PokemonCardProps = {
  id: number;
  name: string;
  types: string[];
  rarity?: SpeciesRarity;
  numberLabel: string;
  caught: boolean;
  shiny: boolean;
  caughtMale: boolean;
  caughtFemale: boolean;
  shinyMale: boolean;
  shinyFemale: boolean;
  games: string[];
  obtainable: boolean | undefined;
  spriteId?: number;
  formName?: string | null;
  capturable?: boolean;
  dimUncaught?: boolean;
  unavailableLabel: string;
  onOpen: () => void;
  onToggleCaught: () => void;
  onToggleShiny: () => void;
  onMoveGame: (fromGame: string, toGame: string) => void;
};

export function PokemonCard({
  id,
  name,
  types,
  rarity,
  numberLabel,
  caught,
  shiny,
  caughtMale,
  caughtFemale,
  shinyMale,
  shinyFemale,
  games,
  obtainable,
  spriteId,
  formName = null,
  capturable = true,
  dimUncaught = true,
  unavailableLabel,
  onOpen,
  onToggleCaught,
  onToggleShiny,
  onMoveGame,
}: PokemonCardProps) {
  const [assignFrom, setAssignFrom] = useState<string | null>(null);
  const marked = capturable && (caught || shiny);
  const bothGenders = caughtMale && caughtFemale;
  const spriteClass = !capturable || marked || !dimUncaught ? "pk-mon-sprite" : "pk-mon-sprite is-dim";
  return (
    <Blueprint className={boxClass("pk-mon", marked, rarity)}>
      <button type="button" className="pk-nav pk-mon-open" onClick={onOpen}>
        <span className="pk-mon-top">
          <span>{numberLabel}</span>
          {capturable ? (
            <span className="pk-mon-mark">
              {caught && shiny ? "NORMAL + SHINY" : shiny ? "SHINY" : caught ? "NORMAL" : ""}
            </span>
          ) : null}
        </span>
        {spriteId != null ? (
          <PokemonSprite pokemonId={spriteId} formName={formName} alt={name} loading="lazy" className={spriteClass} />
        ) : (
          <GenderSprites
            pokemonId={id}
            shiny={shiny && !bothGenders}
            male={!!(bothGenders ? caughtMale : shiny ? shinyMale : caughtMale)}
            female={!!(bothGenders ? caughtFemale : shiny ? shinyFemale : caughtFemale)}
            alt={name}
            loading="lazy"
            className={spriteClass}
          />
        )}
        <span className="pk-name">{name}</span>
        <span className="pk-types">
          {types.map((type) => (
            <TypeTag key={type} type={type} />
          ))}
        </span>
      </button>
      {capturable && games.length ? (
        <span className="pk-mon-games">
          {games.map((gameKey) => (
            <GameKeyTag key={gameKey} gameKey={gameKey} onClick={() => setAssignFrom(gameKey)} />
          ))}
        </span>
      ) : null}
      <AssignGameDialog
        open={assignFrom != null}
        name={name}
        pokemonId={id}
        resourceId={spriteId ?? id}
        fromGame={assignFrom}
        recordedGames={games}
        onClose={() => setAssignFrom(null)}
        onApply={(fromGame, toGame) => {
          onMoveGame(fromGame, toGame);
          setAssignFrom(null);
        }}
      />
      {capturable ? (
        <MarkToggles
          caught={caught}
          shiny={shiny}
          available={obtainable}
          unavailableLabel={unavailableLabel}
          onCaught={onToggleCaught}
          onShiny={onToggleShiny}
        />
      ) : null}
    </Blueprint>
  );
}
