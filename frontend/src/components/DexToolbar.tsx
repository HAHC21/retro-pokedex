import { DEX_STATUSES, activeDexScope, dexScopeButtons } from "../dexList";
import { pillStyle } from "../format";
import type { DexScope, StatusFilter } from "../types";

type DexToolbarProps = {
  game: string;
  q: string;
  status: StatusFilter;
  scope: DexScope;
  statuses?: Array<[StatusFilter, string]>;
  onQuery: (q: string) => void;
  onStatus: (status: StatusFilter) => void;
  onScope: (scope: DexScope) => void;
};

export function DexToolbar({ game, q, status, scope, statuses = DEX_STATUSES, onQuery, onStatus, onScope }: DexToolbarProps) {
  const activeScope = activeDexScope(scope, game);
  const known = new Set(statuses.map(([id]) => id));
  const activeStatus = known.has(status) ? status : "all";
  return (
    <div className="pk-toolbar">
      <div className="seg pk-scope-seg">
        {dexScopeButtons(game).map(([id, label]) => (
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
        {statuses.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="seg-opt pk-toggle"
            style={pillStyle(activeStatus === id, false, { padding: "8px 12px" })}
            onClick={() => onStatus(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
