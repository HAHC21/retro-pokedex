import { Blueprint } from "../components/Blueprint";
import { DexToolbar } from "../components/DexToolbar";
import { GameKeyTag } from "../components/GameTag";
import { MarkToggles } from "../components/MarkToggles";
import { GenderSprites } from "../components/GenderSprites";
import { TypeTag } from "../components/TypeTag";
import { dexCandidateIds, dexHeadCopy, filterDexIds } from "../dexList";
import { dexNum } from "../format";
import type { RegionalDex } from "../pokeapi";
import { gameLabel, unionFor } from "../progress";
import type { GenderChoice } from "../progress";
import type { DexIndex, DexScope, MarkKey, Progress, StatusFilter } from "../types";

type DexViewProps = {
  index: DexIndex;
  indexLoading: boolean;
  prog: Progress;
  game: string;
  gen: number;
  region?: string | null;
  q: string;
  status: StatusFilter;
  scope: DexScope;
  regional: RegionalDex | null;
  regionalLoading: boolean;
  dimUncaught?: boolean;
  obtainable: Record<number, boolean>;
  onQuery: (q: string) => void;
  onStatus: (status: StatusFilter) => void;
  onScope: (scope: DexScope) => void;
  onOpen: (id: number) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
  onToggleGender: (id: number, key: MarkKey, gender: GenderChoice) => void;
};

export function DexView({
  index,
  indexLoading,
  prog,
  game,
  gen,
  region = null,
  q,
  status,
  scope,
  regional,
  regionalLoading,
  dimUncaught = true,
  obtainable,
  onQuery,
  onStatus,
  onScope,
  onOpen,
  onToggleCaught,
  onToggleShiny,
  onToggleGender,
}: DexViewProps) {
  const candidateIds = dexCandidateIds(scope, game, regional, gen, region);
  const grid = filterDexIds(candidateIds, index, prog, status, q);
  const head = dexHeadCopy(scope, game, grid.length, candidateIds.length, "dex", gen, region);

  return (
    <div className="pk-page pk-dex">
      <DexToolbar
        game={game}
        gen={gen}
        region={region}
        q={q}
        status={status}
        scope={scope}
        onQuery={onQuery}
        onStatus={onStatus}
        onScope={onScope}
      />

      <div className="pk-dex-head">
        <h2>{head.title}</h2>
        <span>{head.meta}</span>
      </div>

      {indexLoading || (scope === "regional" && regionalLoading) ? (
        <div className="pk-status">{scope === "regional" ? "Loading regional Pokédex…" : "Loading index from PokéAPI…"}</div>
      ) : null}

      <div className="pk-grid">
        {grid.map((id) => {
          const marks = unionFor(prog, id);
          const marked = !!(marks.caught || marks.shiny);
          const types = index.types[id] || [];
          const available = obtainable[id];
          const numberLabel = scope === "regional" && regional?.numbers[id] ? dexNum(regional.numbers[id]) : dexNum(id);
          return (
            <Blueprint key={id} className={marked ? "pk-mon is-marked" : "pk-mon"}>
              <button type="button" className="pk-nav pk-mon-open" onClick={() => onOpen(id)}>
                <span className="pk-mon-top">
                  <span>{numberLabel}</span>
                  <span className="pk-mon-mark">
                    {marks.caught && marks.shiny ? "NORMAL + SHINY" : marks.shiny ? "SHINY" : marks.caught ? "NORMAL" : ""}
                  </span>
                </span>
                <GenderSprites
                  pokemonId={id}
                  shiny={!!marks.shiny && !(marks.caughtMale && marks.caughtFemale)}
                  male={!!(marks.caughtMale && marks.caughtFemale ? marks.caughtMale : marks.shiny ? marks.shinyMale : marks.caughtMale)}
                  female={!!(marks.caughtMale && marks.caughtFemale ? marks.caughtFemale : marks.shiny ? marks.shinyFemale : marks.caughtFemale)}
                  alt={index.names[id]}
                  loading="lazy"
                  className={marked || !dimUncaught ? "pk-mon-sprite" : "pk-mon-sprite is-dim"}
                />
                <span className="pk-name">{index.names[id]}</span>
                <span className="pk-types">
                  {types.map((type) => (
                    <TypeTag key={type} type={type} />
                  ))}
                </span>
              </button>
              {marks.where.length ? (
                <span className="pk-mon-games">
                  {marks.where.map((gameKey) => (
                    <GameKeyTag key={gameKey} gameKey={gameKey} />
                  ))}
                </span>
              ) : null}
              <MarkToggles
                caught={!!marks.caught}
                shiny={!!marks.shiny}
                caughtMale={!!marks.caughtMale}
                caughtFemale={!!marks.caughtFemale}
                shinyMale={!!marks.shinyMale}
                shinyFemale={!!marks.shinyFemale}
                available={available}
                unavailableLabel={`Not In ${gameLabel(game)}`}
                onCaught={() => onToggleCaught(id)}
                onShiny={() => onToggleShiny(id)}
                onGender={(key, gender) => onToggleGender(id, key, gender)}
              />
            </Blueprint>
          );
        })}
      </div>

      {!indexLoading && !(scope === "regional" && regionalLoading) && grid.length === 0 ? (
        <div className="pk-status">No results for these filters</div>
      ) : null}
    </div>
  );
}
