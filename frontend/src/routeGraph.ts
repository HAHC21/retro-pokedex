export type NodeKind = 0 | 1 | 2;

/** [x, y, label, kind] — kind 0 route, 1 city/town, 2 landmark */
export type RegionNode = [number, number, string, NodeKind];

export type RegionMapDef = {
  id: string;
  title: string;
  /** SVG viewBox string, e.g. "-4 6 108 92" */
  viewBox: string;
  /** viewBox width / height used for aspect ratio and label % */
  width: number;
  height: number;
  originX: number;
  originY: number;
  /** Optional route-circle radius in viewBox units (default ROUTE_R). */
  routeR?: number;
  /** All locations; nodes may have zero edges (isolated landmarks). */
  nodes: Record<string, RegionNode>;
  edges: Array<[string, string]>;
  aliases: Record<string, string>;
};

export type LabelSide = "left" | "right" | "top" | "bottom";

export type RegionGraphNode = {
  id: string;
  kind: NodeKind;
  isRoute: boolean;
  cx: number;
  cy: number;
  r: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  sw: number;
  num: string;
  name: string;
  left: string;
  top: string;
  on: boolean;
  labelSide: LabelSide;
};

export type RegionGraphEdge = {
  pts: string;
  stroke: string;
  sw: number;
};

export type RegionGraph = {
  has: boolean;
  regionId: string;
  title: string;
  label: string;
  count: string;
  viewBox: string;
  width: number;
  height: number;
  nodes: RegionGraphNode[];
  edges: RegionGraphEdge[];
};

const ROUTE_R = 1.6;
const BOX = 2.4;

export function resolveRegionId(def: RegionMapDef, raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  if (def.nodes[raw]) {
    return raw;
  }
  const alias = def.aliases[raw];
  return alias && def.nodes[alias] ? alias : null;
}

function isRouteId(def: RegionMapDef, id: string) {
  return def.nodes[id][3] === 0;
}

function manhattan(ax: number, ay: number, bx: number, by: number) {
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  if (dx < 0.01 || dy < 0.01) {
    return `${ax},${ay} ${bx},${by}`;
  }
  const mid = dy > dx ? [ax, by] : [bx, ay];
  return `${ax},${ay} ${mid[0]},${mid[1]} ${bx},${by}`;
}

function manhattanSegments(ax: number, ay: number, bx: number, by: number): Array<[number, number, number, number]> {
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  if (dx < 0.01 || dy < 0.01) {
    return [[ax, ay, bx, by]];
  }
  const midX = dy > dx ? ax : bx;
  const midY = dy > dx ? by : ay;
  return [
    [ax, ay, midX, midY],
    [midX, midY, bx, by],
  ];
}

type LabelBox = { x0: number; y0: number; x1: number; y1: number };

function labelBox(cx: number, cy: number, side: LabelSide): LabelBox {
  // Approximate name-tag footprint in map units (long city names need width).
  const w = 22;
  const h = 5;
  const gap = 2.5;
  if (side === "right") {
    return { x0: cx + gap, y0: cy - h / 2, x1: cx + gap + w, y1: cy + h / 2 };
  }
  if (side === "left") {
    return { x0: cx - gap - w, y0: cy - h / 2, x1: cx - gap, y1: cy + h / 2 };
  }
  if (side === "top") {
    return { x0: cx - w / 2, y0: cy - gap - h, x1: cx + w / 2, y1: cy - gap };
  }
  return { x0: cx - w / 2, y0: cy + gap, x1: cx + w / 2, y1: cy + gap + h };
}

function segmentHitsBox(x1: number, y1: number, x2: number, y2: number, box: LabelBox): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < box.x0 || minX > box.x1 || maxY < box.y0 || minY > box.y1) {
    return false;
  }
  // Axis-aligned Manhattan segments: clip against the box.
  if (Math.abs(y1 - y2) < 0.01) {
    const y = y1;
    return y >= box.y0 && y <= box.y1 && maxX >= box.x0 && minX <= box.x1;
  }
  if (Math.abs(x1 - x2) < 0.01) {
    const x = x1;
    return x >= box.x0 && x <= box.x1 && maxY >= box.y0 && minY <= box.y1;
  }
  return true;
}

function collectEdgeSegments(def: RegionMapDef): Array<[number, number, number, number]> {
  const segments: Array<[number, number, number, number]> = [];
  for (const [from, to] of def.edges) {
    const a = def.nodes[from];
    const b = def.nodes[to];
    segments.push(...manhattanSegments(a[0], a[1], b[0], b[1]));
  }
  return segments;
}

function pickLabelSide(
  def: RegionMapDef,
  nodeId: string,
  cx: number,
  cy: number,
  segments: Array<[number, number, number, number]>,
): LabelSide {
  const sides: LabelSide[] = ["right", "left", "top", "bottom"];
  const scores: Record<LabelSide, number> = { right: 0, left: 0, top: 0, bottom: 0 };

  for (const [from, to] of def.edges) {
    if (from !== nodeId && to !== nodeId) {
      continue;
    }
    const other = def.nodes[from === nodeId ? to : from];
    const dx = other[0] - cx;
    const dy = other[1] - cy;
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) {
        scores.right -= 4;
      } else if (dx < 0) {
        scores.left -= 4;
      }
    } else if (dy > 0) {
      scores.bottom -= 4;
    } else if (dy < 0) {
      scores.top -= 4;
    }
  }

  for (const side of sides) {
    const box = labelBox(cx, cy, side);
    if (box.x0 < def.originX + 1 || box.x1 > def.originX + def.width - 1) {
      scores[side] -= 6;
    }
    if (box.y0 < def.originY + 1 || box.y1 > def.originY + def.height - 1) {
      scores[side] -= 6;
    }
    for (const [x1, y1, x2, y2] of segments) {
      if (segmentHitsBox(x1, y1, x2, y2, box)) {
        scores[side] -= 10;
      }
    }
  }

  // Soft preference: keep eastern nodes labeled inward.
  const midX = def.originX + def.width * 0.55;
  if (cx > midX) {
    scores.left += 1;
  } else {
    scores.right += 1;
  }

  let best: LabelSide = "right";
  let bestScore = -Infinity;
  for (const side of sides) {
    if (scores[side] > bestScore) {
      bestScore = scores[side];
      best = side;
    }
  }
  return best;
}

export function buildRegionGraph(def: RegionMapDef, hits: Record<string, number>): RegionGraph {
  const lit = (id: string) => hits[id] !== undefined;
  const segments = collectEdgeSegments(def);
  const routeR = def.routeR ?? ROUTE_R;
  const box = def.routeR ? def.routeR * 1.5 : BOX;
  const nodes = Object.keys(def.nodes).map((id) => {
    const [cx, cy, label, kind] = def.nodes[id];
    const on = lit(id);
    const numMatch = label.match(/\d+/);
    const isCity = kind === 1;
    const fill = on
      ? "var(--color-accent)"
      : isCity
        ? "#5c4a7a"
        : "var(--color-neutral-300)";
    const stroke = on
      ? "var(--color-accent-900)"
      : isCity
        ? "#3a2d52"
        : "var(--color-neutral-400)";
    return {
      id,
      kind,
      isRoute: kind === 0,
      cx,
      cy,
      r: routeR,
      x: cx - box / 2,
      y: cy - box / 2,
      w: box,
      h: box,
      fill,
      stroke,
      sw: on ? 0.55 : 0.4,
      num: kind === 0 ? numMatch?.[0] || "" : "",
      name: on && kind !== 0 ? `${label}${hits[id] ? ` ${hits[id]}%` : ""}` : "",
      left: `${((cx - def.originX) / def.width) * 100}%`,
      top: `${((cy - def.originY) / def.height) * 100}%`,
      on,
      labelSide: pickLabelSide(def, id, cx, cy, segments),
    };
  });
  const edges = def.edges
    .filter(([from, to]) => def.nodes[from] && def.nodes[to])
    .map(([from, to]) => {
      const a = def.nodes[from];
      const b = def.nodes[to];
      const on = (isRouteId(def, from) && lit(from)) || (isRouteId(def, to) && lit(to));
      return {
        pts: manhattan(a[0], a[1], b[0], b[1]),
        stroke: on ? "var(--color-accent)" : "var(--color-neutral-300)",
        sw: on ? 0.85 : 0.55,
      };
    });
  return {
    has: Object.keys(hits).length > 0,
    regionId: def.id,
    title: `${def.title} route graph`,
    label: def.title,
    count: `${Object.keys(hits).length} locations in ${def.title}`,
    viewBox: def.viewBox,
    width: def.width,
    height: def.height,
    nodes,
    edges,
  };
}
