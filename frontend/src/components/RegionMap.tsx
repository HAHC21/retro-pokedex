import { navBtnStyle } from "../format";
import type { RegionGraph } from "../routeGraph";

type RegionMapProps = {
  graph: RegionGraph;
  regions: RegionGraph[];
  onSelectRegion: (regionId: string) => void;
};

export function RegionMap({ graph, regions, onSelectRegion }: RegionMapProps) {
  if (!graph.has) {
    return null;
  }
  return (
    <div className="pk-map-wrap">
      <span className="pk-map-head">
        <span className="pk-map-tabs" role="tablist" aria-label="Region maps">
          {regions.map((region) => {
            const active = region.regionId === graph.regionId;
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
                {region.label}
              </button>
            );
          })}
        </span>
        <span className="pk-map-count">{graph.count}</span>
      </span>
      <div className="pk-map" style={{ aspectRatio: `${graph.width} / ${graph.height}` }}>
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
          {graph.nodes.map((node) =>
            node.isRoute ? (
              <circle key={node.id} cx={node.cx} cy={node.cy} r={node.r} fill={node.fill} stroke={node.stroke} strokeWidth={node.sw} />
            ) : (
              <rect key={node.id} x={node.x} y={node.y} width={node.w} height={node.h} fill={node.fill} stroke={node.stroke} strokeWidth={node.sw} />
            ),
          )}
        </svg>
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
            <span key={`${node.id}-name`} className="pk-map-label pk-map-name" data-side={node.labelSide} style={{ left: node.left, top: node.top }}>
              {node.name}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
