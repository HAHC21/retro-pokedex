import { DEX_STATUSES, activeDexScope, dexScopeButtons, isRegionBrowseMode, regionBrowseLabel } from "../dexList";
import { gameByKey, genById, regionBySlug } from "../catalog";
import { pillStyle } from "../format";
import type { DexScope, StatusFilter } from "../types";
import { InfoTip } from "./InfoTip";

type DexToolbarProps = {
  game: string;
  gen: number;
  region?: string | null;
  q: string;
  status: StatusFilter;
  scope: DexScope;
  formListTitle?: string | null;
  statuses?: Array<[StatusFilter, string]>;
  onQuery: (q: string) => void;
  onStatus: (status: StatusFilter) => void;
  onScope: (scope: DexScope) => void;
};

export function DexToolbar({
  game,
  gen,
  region = null,
  q,
  status,
  scope,
  formListTitle = null,
  statuses = DEX_STATUSES,
  onQuery,
  onStatus,
  onScope,
}: DexToolbarProps) {
  const activeScope = activeDexScope(scope, game);
  const known = new Set(statuses.map(([id]) => id));
  const activeStatus = known.has(status) ? status : "all";
  const meta = gameByKey(game);
  const nativeGen = meta && meta.g > 0 ? genById(meta.g) : null;
  const origin = regionBySlug(region);
  const regionBrowse = isRegionBrowseMode(region);
  const scopeOptions = dexScopeButtons(game, gen, activeScope, region);
  const browseLabel = regionBrowseLabel(region);

  return (
    <div className="pk-toolbar">
      <div className="pk-scope-block">
        <div className="pk-scope-label-row">
          <span className="pk-kicker">Dex scope</span>
          <InfoTip label="About Regional, National, and generation filters" wide>
            {formListTitle ? (
              <p>
                This list shows <strong>{formListTitle}</strong>. Each card opens that form. Marks here are stored on the
                form, separate from the base species.
              </p>
            ) : regionBrowse ? (
              <p>
                You opened a region from the homepage. This list shows only species{" "}
                <strong>introduced</strong> in {origin?.name} ({browseLabel}), using Global Collection marks. Switch
                games in the header to return to Regional / National scopes.
              </p>
            ) : (
              <>
                <p>
                  These buttons change <strong>which Pokémon appear in the list</strong> for the selected game — they do
                  not change your marks.
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
                      <strong>GEN {nativeGen.roman}</strong> — only species <em>introduced</em> in generation{" "}
                      {nativeGen.roman}, not earlier-generation Pokémon that also appear in this game.
                    </li>
                  ) : (
                    <li>
                      <strong>GEN</strong> — only species newly introduced in this game&apos;s native generation (shown
                      for cartridge titles, not HOME).
                    </li>
                  )}
                </ul>
              </>
            )}
          </InfoTip>
        </div>
        <div className="seg pk-scope-seg">
          {formListTitle ? (
            <button type="button" className="seg-opt pk-toggle" style={pillStyle(true, false, { padding: "8px 12px" })} aria-pressed>
              {formListTitle}
            </button>
          ) : (
            scopeOptions.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="seg-opt pk-toggle"
                style={pillStyle(activeScope === id, false, { padding: "8px 12px" })}
                aria-pressed={activeScope === id}
                onClick={() => {
                  if (!regionBrowse) {
                    onScope(id);
                  }
                }}
              >
                {label}
              </button>
            ))
          )}
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
