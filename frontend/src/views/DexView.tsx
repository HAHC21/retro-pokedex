import { Blueprint } from "../components/Blueprint";
import { TypeTag } from "../components/TypeTag";
import { gameByKey, genById, gensForGame } from "../catalog";
import { dexNum, pillStyle, spriteUrl } from "../format";
import type { RegionalDex } from "../pokeapi";
import { entryFor, gameLabel, unionSets } from "../progress";
import type { DexIndex, DexScope, Progress, StatusFilter } from "../types";

type DexViewProps = {
  index: DexIndex;
  indexLoading: boolean;
  prog: Progress;
  game: string;
  gen: number;
  q: string;
  status: StatusFilter;
  scope: DexScope;
  regional: RegionalDex | null;
  regionalLoading: boolean;
  dimUncaught?: boolean;
  obtainable: Record<number, boolean>;
  onGen: (gen: number) => void;
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

const SCOPES: Array<[DexScope, string]> = [
  ["regional", "Regional"],
  ["national", "National"],
];

export function DexView({
  index,
  indexLoading,
  prog,
  game,
  gen,
  q,
  status,
  scope,
  regional,
  regionalLoading,
  dimUncaught = true,
  obtainable,
  onGen,
  onQuery,
  onStatus,
  onScope,
  onOpen,
  onToggleCaught,
  onToggleShiny,
}: DexViewProps) {
  const regions = gensForGame(game);
  const g = genById(gen);
  const gameMeta = gameByKey(game);
  const needle = q.trim().toLowerCase();
  const activeProg = prog[game] || {};
  const { caught: uCaught } = unionSets(prog);
  const nationalMax = gameMeta && gameMeta.g > 0 ? genById(gameMeta.g).to : 1025;

  const candidateIds: number[] =
    scope === "regional"
      ? regional?.ids || []
      : (() => {
          const ids: number[] = [];
          for (let i = g.from; i <= Math.min(g.to, nationalMax); i++) {
            ids.push(i);
          }
          return ids;
        })();

  const grid: number[] = [];
  candidateIds.forEach((id) => {
    const name = index.names[id];
    if (!name) {
      return;
    }
    const entry = activeProg[String(id)] || {};
    if (status === "missing" && (entry.caught || entry.shiny)) {
      return;
    }
    if (status === "missing-normal" && entry.caught) {
      return;
    }
    if (status === "missing-shiny" && entry.shiny) {
      return;
    }
    if (status === "normal" && !entry.caught) {
      return;
    }
    if (status === "shiny" && !entry.shiny) {
      return;
    }
    if (needle && name.toLowerCase().indexOf(needle) === -1 && String(id).indexOf(needle) === -1) {
      return;
    }
    grid.push(id);
  });

  const headTitle =
    scope === "regional" ? `Regional Dex · ${gameLabel(game)}` : `${g.region} · ${gameLabel(game)}`;
  const headMeta =
    scope === "regional"
      ? `Regional · ${grid.length} of ${candidateIds.length || "…"} shown`
      : `National · ${g.games} · ${grid.length} of ${candidateIds.length} shown`;

  return (
    <div className="pk-page pk-dex">
      <div className="pk-toolbar">
        <label className="field pk-field">
          <span>Region / Generation</span>
          <select
            className="input"
            value={String(gen)}
            disabled={scope === "regional"}
            onChange={(event) => onGen(parseInt(event.target.value, 10))}
          >
            {regions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.region} · Gen {entry.roman}
              </option>
            ))}
          </select>
        </label>
        <div className="seg pk-scope-seg">
          {SCOPES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="seg-opt pk-toggle"
              style={pillStyle(scope === id, false, { padding: "8px 12px" })}
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
          const entry = entryFor(prog, game, id);
          const marked = !!(entry.caught || entry.shiny);
          const types = index.types[id] || [];
          const available = obtainable[id];
          const numberLabel = scope === "regional" && regional?.numbers[id] ? dexNum(regional.numbers[id]) : dexNum(id);
          return (
            <Blueprint key={id} className={marked ? "pk-mon is-marked" : "pk-mon"}>
              <button type="button" className="pk-nav pk-mon-open" onClick={() => onOpen(id)}>
                <span className="pk-mon-top">
                  <span>{numberLabel}</span>
                  <span className="pk-mon-mark">
                    {entry.caught && entry.shiny ? "NORMAL + SHINY" : entry.shiny ? "SHINY" : entry.caught ? "NORMAL" : ""}
                  </span>
                </span>
                <img
                  src={spriteUrl(id, !!entry.shiny)}
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
                <span className="pk-alt">{!entry.caught && uCaught[id] ? "In another game" : ""}</span>
              </button>
              {available === true ? (
                <span className="pk-toggles">
                  <button type="button" className="pk-toggle" style={pillStyle(!!entry.caught, false)} onClick={() => onToggleCaught(id)}>
                    Normal
                  </button>
                  <button type="button" className="pk-toggle" style={pillStyle(!!entry.shiny, true)} onClick={() => onToggleShiny(id)}>
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
