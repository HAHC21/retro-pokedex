import { Blueprint } from "../components/Blueprint";
import { GameKeyTag } from "../components/GameTag";
import { TypeTag } from "../components/TypeTag";
import { gameByKey, genById, introducedIdsForGame, nationalIdsForGame } from "../catalog";
import { dexNum, pillStyle, spriteUrl } from "../format";
import type { RegionalDex } from "../pokeapi";
import { gameLabel, unionFor, unionSets } from "../progress";
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

const STATUSES: Array<[StatusFilter, string]> = [
  ["all", "All"],
  ["missing", "Missing"],
  ["missing-normal", "Missing Normal"],
  ["missing-shiny", "Missing Shiny"],
  ["normal", "Owned Normal"],
  ["shiny", "Owned Shiny"],
];

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
  const gameMeta = gameByKey(game);
  const nativeGen = gameMeta && gameMeta.g > 0 ? genById(gameMeta.g) : null;
  const activeScope: DexScope = scope === "generation" && !nativeGen ? "national" : scope;
  const needle = q.trim().toLowerCase();
  const { caught: uCaught, shiny: uShiny, any: uAny } = unionSets(prog);

  const candidateIds: number[] =
    activeScope === "regional"
      ? regional?.ids || []
      : activeScope === "generation"
        ? introducedIdsForGame(game)
        : nationalIdsForGame(game);

  const grid: number[] = [];
  candidateIds.forEach((id) => {
    const name = index.names[id];
    if (!name) {
      return;
    }
    if (status === "missing" && uAny[id]) {
      return;
    }
    if (status === "missing-normal" && uCaught[id]) {
      return;
    }
    if (status === "missing-shiny" && uShiny[id]) {
      return;
    }
    if (status === "normal" && !uCaught[id]) {
      return;
    }
    if (status === "shiny" && !uShiny[id]) {
      return;
    }
    if (needle && name.toLowerCase().indexOf(needle) === -1 && String(id).indexOf(needle) === -1) {
      return;
    }
    grid.push(id);
  });

  const scopes: Array<[DexScope, string]> = [
    ["regional", "Regional"],
    ["national", "National"],
  ];
  if (nativeGen) {
    scopes.push(["generation", `GEN ${nativeGen.roman}`]);
  }

  const headTitle =
    activeScope === "regional"
      ? `Regional Dex · ${gameLabel(game)}`
      : activeScope === "generation" && nativeGen
        ? `GEN ${nativeGen.roman} · ${gameLabel(game)}`
        : `National Dex · ${gameLabel(game)}`;
  const headMeta =
    activeScope === "regional"
      ? `Regional · ${grid.length} of ${candidateIds.length || "…"} shown`
      : activeScope === "generation" && nativeGen
        ? `New in GEN ${nativeGen.roman} · ${grid.length} of ${candidateIds.length} shown`
        : `National · ${grid.length} of ${candidateIds.length} shown`;

  return (
    <div className="pk-page pk-dex">
      <div className="pk-toolbar">
        <div className="seg pk-scope-seg">
          {scopes.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="seg-opt pk-toggle"
              style={pillStyle(activeScope === id, false, { padding: "8px 12px" })}
              onClick={() => onScope(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="field pk-field pk-search">
          <span>Search</span>
          <input className="input" type="search" placeholder="Name or number" value={q} onChange={(event) => onQuery(event.target.value)} />
        </label>
        <div className="seg">
          {STATUSES.map(([id, label]) => (
            <button key={id} type="button" className="seg-opt pk-toggle" style={pillStyle(status === id, false, { padding: "8px 12px" })} onClick={() => onStatus(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pk-dex-head">
        <h2>{headTitle}</h2>
        <span>{headMeta}</span>
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
              {available === true ? (
                <span className="pk-toggles">
                  <button type="button" className="pk-toggle" style={pillStyle(!!marks.caught, false)} onClick={() => onToggleCaught(id)}>
                    Normal
                  </button>
                  <button type="button" className="pk-toggle" style={pillStyle(!!marks.shiny, true)} onClick={() => onToggleShiny(id)}>
                    Shiny
                  </button>
                </span>
              ) : available === false ? (
                <span className="pk-unavailable">Not In {gameLabel(game)}</span>
              ) : (
                <span className="pk-unavailable">Checking obtainability…</span>
              )}
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
