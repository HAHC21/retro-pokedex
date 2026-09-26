import { REGIONS } from "../catalog";
import { collectionStatuses } from "../collectionList";
import { pillStyle } from "../format";
import { useI18n } from "../i18n/context";
import { localizedRegion } from "../i18n/labels";
import type { CollectionFilter } from "../types";
import { InfoTip } from "./InfoTip";

type CollectionToolbarProps = {
  q: string;
  filter: CollectionFilter;
  originRegion: string | null;
  onQuery: (q: string) => void;
  onFilter: (filter: CollectionFilter) => void;
  onOriginRegion: (slug: string | null) => void;
};

export function CollectionToolbar({
  q,
  filter,
  originRegion,
  onQuery,
  onFilter,
  onOriginRegion,
}: CollectionToolbarProps) {
  const { messages: m } = useI18n();
  const statusOptions = collectionStatuses();
  const known = new Set(statusOptions.map(([id]) => id));
  const active = known.has(filter) ? filter : "all";

  return (
    <div className="pk-toolbar">
      <label className="field pk-field pk-region-field">
        <span className="pk-scope-label-row">
          <span>{m.collection.region}</span>
          <InfoTip label={m.collection.about} wide>
            <p>{m.collection.aboutRegion}</p>
            <p>{m.collection.which}</p>
          </InfoTip>
        </span>
        <select
          className="input"
          value={originRegion || ""}
          onChange={(event) => onOriginRegion(event.target.value || null)}
        >
          <option value="">{m.collection.allRegions}</option>
          {REGIONS.map((entry) => (
            <option key={entry.slug} value={entry.slug}>
              {localizedRegion(entry.slug) || entry.name}
            </option>
          ))}
        </select>
      </label>
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
            style={pillStyle(active === id, false, { padding: "8px 12px" })}
            onClick={() => onFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
