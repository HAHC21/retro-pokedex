import { DEX_STATUSES, activeDexScope, dexScopeButtons } from "../dexList";
import { gameByKey, genById } from "../catalog";
import { pillStyle } from "../format";
import type { DexScope, StatusFilter } from "../types";
import { InfoTip } from "./InfoTip";

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
  const meta = gameByKey(game);
  const nativeGen = meta && meta.g > 0 ? genById(meta.g) : null;

  return (
    <div className="pk-toolbar">
      <div className="pk-scope-block">
        <div className="pk-scope-label-row">
          <span className="pk-kicker">Dex scope</span>
          <InfoTip label="About Regional, National, and generation filters" wide>
            <p>
              These buttons change <strong>which Pokémon appear in the list</strong> for the selected game — they do not
              change your marks.
            </p>
            <ul>
              <li>
                <strong>Regional</strong> — only species in this game&apos;s regional Pokédex (e.g. Johto dex for
                HeartGold / SoulSilver), using regional numbers when available.
              </li>
              <li>
                <strong>National</strong> — the full National Dex available up through this game&apos;s era (every
                species you could transfer or encounter in that generation of titles).
              </li>
              {nativeGen ? (
                <li>
                  <strong>GEN {nativeGen.roman}</strong> — only species <em>introduced</em> in {nativeGen.region} (new
                  in Gen {nativeGen.roman}), not earlier-generation Pokémon that also appear in this game.
                </li>
              ) : (
                <li>
                  <strong>GEN</strong> — only species newly introduced in this game&apos;s native generation (shown for
                  cartridge titles, not HOME).
                </li>
              )}
            </ul>
          </InfoTip>
        </div>
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
