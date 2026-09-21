import { Blueprint } from "../components/Blueprint";
import { DexToolbar } from "../components/DexToolbar";
import { GameKeyTag } from "../components/GameTag";
import { MarkToggles } from "../components/MarkToggles";
import { TypeTag } from "../components/TypeTag";
import { dexCandidateIds, dexHeadCopy, filterDexIds } from "../dexList";
import { dexNum, spriteUrl } from "../format";
import type { RegionalDex } from "../pokeapi";
import { gameLabel, unionFor } from "../progress";
import type { DexIndex, DexScope, Progress, StatusFilter } from "../types";

type DexViewProps = {
  index: DexIndex;
  indexLoading: boolean;
  prog: Progress;
  game: string;
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
};

export function DexView({
  index,
  indexLoading,
  prog,
  game,
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
}: DexViewProps) {
  const candidateIds = dexCandidateIds(scope, game, regional);
  const grid = filterDexIds(candidateIds, index, prog, status, q);
  const head = dexHeadCopy(scope, game, grid.length, candidateIds.length, "dex");

  return (
    <div className="pk-page pk-dex">
      <DexToolbar game={game} q={q} status={status} scope={scope} onQuery={onQuery} onStatus={onStatus} onScope={onScope} />

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
                <img
                  src={spriteUrl(id, !!marks.shiny)}
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
                available={available}
                unavailableLabel={`Not In ${gameLabel(game)}`}
                onCaught={() => onToggleCaught(id)}
                onShiny={() => onToggleShiny(id)}
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
