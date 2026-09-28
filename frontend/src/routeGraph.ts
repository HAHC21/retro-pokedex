export type NodeKind = 0 | 1 | 2;

/** [x, y, label, kind] — kind 0 route, 1 city/town, 2 landmark */
export type RegionNode = [number, number, string, NodeKind];

/** Optional third slot: "straight" draws a diagonal; omitted = Manhattan. */
export type RegionEdge = [string, string] | [string, string, "straight"];

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
  /** All locations; nodes may have zero edges (isolated landmarks). */
  nodes: Record<string, RegionNode>;
  edges: RegionEdge[];
  aliases: Record<string, string>;
};

export type LabelSide = "left" | "right" | "top" | "bottom";

export type RegionGraphNode = {
  id: string;
  kind: NodeKind;
  isRoute: boolean;
  isCity: boolean;
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

/** Unova's viewBox width; node/line sizes are scaled so every map matches this on screen. */
const VISUAL_REF_WIDTH = 380;
const ROUTE_R = 3.6;
const BOX = ROUTE_R * 1.5;
const CITY_BOX = ROUTE_R * 2;
const NODE_SW_ON = 0.55;
const NODE_SW_OFF = 0.4;
const EDGE_SW_ON = 0.85;
const EDGE_SW_OFF = 0.55;

function mapUnit(def: RegionMapDef, refSize: number) {
  return (refSize / VISUAL_REF_WIDTH) * def.width;
}

export function resolveRegionId(def: RegionMapDef, raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  if (def.nodes[raw]) {
    return raw;
  }
  const alias = def.aliases[raw];
  if (alias && def.nodes[alias]) {
    return alias;
  }
  if (raw.startsWith("friend-safari-") && def.nodes["friend-safari"]) {
    return "friend-safari";
  }
  return null;
}

function isRouteId(def: RegionMapDef, id: string) {
  return def.nodes[id][3] === 0;
}

function isStraight(edge: RegionEdge) {
  return edge[2] === "straight";
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

function straightPath(ax: number, ay: number, bx: number, by: number) {
  return `${ax},${ay} ${bx},${by}`;
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

function edgePath(ax: number, ay: number, bx: number, by: number, straight: boolean) {
  return straight ? straightPath(ax, ay, bx, by) : manhattan(ax, ay, bx, by);
}

function edgeSegments(ax: number, ay: number, bx: number, by: number, straight: boolean): Array<[number, number, number, number]> {
  return straight ? [[ax, ay, bx, by]] : manhattanSegments(ax, ay, bx, by);
}

type LabelBox = { x0: number; y0: number; x1: number; y1: number };

function labelBox(cx: number, cy: number, side: LabelSide, kind: NodeKind, def: RegionMapDef): LabelBox {
  const rate = kind === 0;
  const w = rate ? mapUnit(def, 9.5) : 22;
  const h = rate ? mapUnit(def, 9.5) : 5;
  const gap = rate ? mapUnit(def, 4) : 2.5;
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
  for (const edge of def.edges) {
    const a = def.nodes[edge[0]];
    const b = def.nodes[edge[1]];
    segments.push(...edgeSegments(a[0], a[1], b[0], b[1], isStraight(edge)));
  }
  return segments;
}

function pickLabelSide(
  def: RegionMapDef,
  nodeId: string,
  cx: number,
  cy: number,
  kind: NodeKind,
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
    const box = labelBox(cx, cy, side, kind, def);
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

function spawnTag(kind: NodeKind, label: string, rate: number | undefined, on: boolean): string {
  if (!on) {
    return "";
  }
  const pct = rate ? `${rate}%` : "";
  if (kind === 0) {
    return pct;
  }
  return pct ? `${label} ${pct}` : label;
}

export function buildRegionGraph(def: RegionMapDef, hits: Record<string, number>): RegionGraph {
  const lit = (id: string) => hits[id] !== undefined;
  const segments = collectEdgeSegments(def);
  const routeR = mapUnit(def, ROUTE_R);
  const box = mapUnit(def, BOX);
  const cityBox = mapUnit(def, CITY_BOX);
  const nodeSwOn = mapUnit(def, NODE_SW_ON);
  const nodeSwOff = mapUnit(def, NODE_SW_OFF);
  const edgeSwOn = mapUnit(def, EDGE_SW_ON);
  const edgeSwOff = mapUnit(def, EDGE_SW_OFF);
  const nodes = Object.keys(def.nodes).map((id) => {
    const [cx, cy, label, kind] = def.nodes[id];
    const on = lit(id);
    const numMatch = label.match(/\d+/);
    const isCity = kind === 1;
    const nodeBox = isCity ? cityBox : box;
    const fill = on ? "var(--color-accent)" : "var(--color-neutral-300)";
    const stroke = on ? "var(--color-accent-900)" : "var(--color-neutral-400)";
    return {
      id,
      kind,
      isRoute: kind === 0,
      isCity,
      cx,
      cy,
      r: routeR,
      x: cx - nodeBox / 2,
      y: cy - nodeBox / 2,
      w: nodeBox,
      h: nodeBox,
      fill,
      stroke,
      sw: on ? nodeSwOn : nodeSwOff,
      num: kind === 0 ? numMatch?.[0] || "" : "",
      name: spawnTag(kind, label, hits[id], on),
      left: `${((cx - def.originX) / def.width) * 100}%`,
      top: `${((cy - def.originY) / def.height) * 100}%`,
      on,
      labelSide: pickLabelSide(def, id, cx, cy, kind, segments),
    };
  });
  const edges = def.edges
    .filter((edge) => def.nodes[edge[0]] && def.nodes[edge[1]])
    .map((edge) => {
      const from = edge[0];
      const to = edge[1];
      const a = def.nodes[from];
      const b = def.nodes[to];
      const on = (isRouteId(def, from) && lit(from)) || (isRouteId(def, to) && lit(to));
      return {
        pts: edgePath(a[0], a[1], b[0], b[1], isStraight(edge)),
        stroke: on ? "var(--color-accent)" : "var(--color-neutral-300)",
        sw: on ? edgeSwOn : edgeSwOff,
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
