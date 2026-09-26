import { activeDexScope, dexScopeButtons, dexStatuses, isRegionBrowseMode, regionBrowseLabel } from "../dexList";
import { gameByKey, genById, regionBySlug } from "../catalog";
import { pillStyle } from "../format";
import { useI18n } from "../i18n/context";
import { localizedRegion } from "../i18n/labels";
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
  statuses,
  onQuery,
  onStatus,
  onScope,
}: DexToolbarProps) {
  const { messages: m, fill } = useI18n();
  const statusOptions = statuses ?? dexStatuses();
  const activeScope = activeDexScope(scope, game);
  const known = new Set(statusOptions.map(([id]) => id));
  const activeStatus = known.has(status) ? status : "all";
  const meta = gameByKey(game);
  const nativeGen = meta && meta.g > 0 ? genById(meta.g) : null;
  const origin = regionBySlug(region);
  const regionName = origin ? localizedRegion(origin.slug) || origin.name : "";
  const regionBrowse = isRegionBrowseMode(region);
  const scopeOptions = dexScopeButtons(game, gen, activeScope, region);
  const browseLabel = regionBrowseLabel(region);

  return (
    <div className="pk-toolbar">
      <div className="pk-scope-block">
        <div className="pk-scope-label-row">
          <span className="pk-kicker">{m.dex.scope}</span>
          <InfoTip label={m.dex.about} wide>
            {formListTitle ? (
              <p>{fill(m.dex.formList, { title: formListTitle })}</p>
            ) : regionBrowse ? (
              <p>{fill(m.dex.regionBrowse, { region: regionName, label: browseLabel })}</p>
            ) : (
              <>
                <p>{m.dex.which}</p>
                <ul>
                  <li>{m.dex.regional}</li>
                  <li>{m.dex.national}</li>
                  {nativeGen ? (
                    <li>{fill(m.dex.genIntro, { roman: nativeGen.roman })}</li>
                  ) : (
                    <li>{m.dex.genHome}</li>
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
        <span>{m.dex.search}</span>
        <input className="input" type="search" placeholder={m.dex.placeholder} value={q} onChange={(event) => onQuery(event.target.value)} />
      </label>
      <div className="seg pk-status-seg">
        {statusOptions.map(([id, label]) => (
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
