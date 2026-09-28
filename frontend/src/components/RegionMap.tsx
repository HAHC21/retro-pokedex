import { navBtnStyle } from "../format";
import { useI18n } from "../i18n/context";
import { localizedRegion } from "../i18n/labels";
import { fill } from "../i18n/runtime";
import type { RegionGraph } from "../routeGraph";
import { LogoPokeBall } from "./LogoPokeBall";

export type RegionTab = {
  regionId: string;
  label: string;
};

type RegionMapProps = {
  graph: RegionGraph | null;
  regions: RegionTab[];
  activeRegionId: string;
  onSelectRegion: (regionId: string) => void;
};

export function RegionMap({ graph, regions, activeRegionId, onSelectRegion }: RegionMapProps) {
  const { messages: m } = useI18n();
  if (!regions.length) {
    return null;
  }
  const regionLabel =
    localizedRegion(activeRegionId) || regions.find((region) => region.regionId === activeRegionId)?.label || activeRegionId;
  const showMap = Boolean(graph?.has);
  return (
    <div className="pk-map-wrap">
      <span className="pk-map-head">
        <span className="pk-map-tabs" role="tablist" aria-label={m.detail.maps}>
          {regions.map((region) => {
            const active = region.regionId === activeRegionId;
            const label = localizedRegion(region.regionId) || region.label;
            return (
              <button
                key={region.regionId}
                type="button"
                role="tab"
                aria-selected={active}
                className="btn pk-nav pk-map-tab"
                style={navBtnStyle(active)}
                onClick={() => onSelectRegion(region.regionId)}
              >
                {label}
              </button>
            );
          })}
        </span>
        {showMap && graph ? <span className="pk-map-count">{graph.count}</span> : null}
      </span>
      {showMap && graph ? (
        <RegionMapCanvas graph={graph} />
      ) : (
        <p className="pk-map-unavailable" role="tabpanel" aria-live="polite">
          {fill(m.detail.mapUnavailable, { region: regionLabel })}
        </p>
      )}
    </div>
  );
}

function RegionMapCanvas({ graph }: { graph: RegionGraph }) {
  return (
    <div className="pk-map" style={{ aspectRatio: `${graph.width} / ${graph.height}` }} role="tabpanel">
      <svg viewBox={graph.viewBox} aria-hidden="true">
        {graph.edges.map((edge, index) => (
          <polyline
            key={`${graph.regionId}-${edge.pts}-${index}`}
            points={edge.pts}
            fill="none"
            stroke={edge.stroke}
            strokeWidth={edge.sw}
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
        ))}
        {graph.nodes.map((node) => {
          if (node.isRoute) {
            return (
              <circle key={node.id} cx={node.cx} cy={node.cy} r={node.r} fill={node.fill} stroke={node.stroke} strokeWidth={node.sw} />
            );
          }
          if (node.isCity) {
            return null;
          }
          return (
            <rect key={node.id} x={node.x} y={node.y} width={node.w} height={node.h} fill={node.fill} stroke={node.stroke} strokeWidth={node.sw} />
          );
        })}
      </svg>
      {graph.nodes.map((node) =>
        node.isCity ? (
          <span
            key={`${node.id}-town`}
            className="pk-map-label pk-map-town"
            style={{
              left: node.left,
              top: node.top,
              width: `${(node.w / graph.width) * 100}%`,
            }}
          >
            <LogoPokeBall muted={!node.on} />
          </span>
        ) : null,
      )}
      {graph.nodes.map((node) =>
        node.num ? (
          <span
            key={`${node.id}-num`}
            className={node.on ? "pk-map-label pk-map-num is-on" : "pk-map-label pk-map-num"}
            style={{
              left: node.left,
              top: node.top,
              width: `${((2 * node.r) / graph.width) * 100}%`,
            }}
          >
            {node.num}
          </span>
        ) : null,
      )}
      {graph.nodes.map((node) =>
        node.name ? (
          <span
            key={`${node.id}-name`}
            className={node.isRoute ? "pk-map-label pk-map-name pk-map-rate" : "pk-map-label pk-map-name"}
            data-side={node.labelSide}
            style={{ left: node.left, top: node.top }}
          >
            {node.name}
          </span>
        ) : null,
      )}
    </div>
  );
}
