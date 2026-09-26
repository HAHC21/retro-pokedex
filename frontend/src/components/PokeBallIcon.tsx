type BallKind = "poke" | "ultra";

type PokeBallIconProps = {
  caught: boolean;
  size?: number;
  kind?: BallKind;
  label?: string;
};

type Pixel = [number, number];

/** Symmetric 16×16 pixel Poké Ball (centered circle). */
const OUTLINE: Pixel[] = [
  [6, 1], [7, 1], [8, 1], [9, 1],
  [4, 2], [5, 2], [10, 2], [11, 2],
  [3, 3], [12, 3],
  [2, 4], [13, 4],
  [2, 5], [13, 5],
  [1, 6], [14, 6],
  [1, 7], [14, 7],
  [1, 8], [14, 8],
  [1, 9], [14, 9],
  [2, 10], [13, 10],
  [2, 11], [13, 11],
  [3, 12], [12, 12],
  [4, 13], [5, 13], [10, 13], [11, 13],
  [6, 14], [7, 14], [8, 14], [9, 14],
];

const BAND: Pixel[] = [
  [2, 7], [3, 7], [4, 7], [5, 7], [10, 7], [11, 7], [12, 7], [13, 7],
  [2, 8], [3, 8], [4, 8], [5, 8], [10, 8], [11, 8], [12, 8], [13, 8],
];

const BUTTON_RING: Pixel[] = [
  [6, 6], [7, 6], [8, 6], [9, 6],
  [5, 7], [10, 7],
  [5, 8], [10, 8],
  [6, 9], [7, 9], [8, 9], [9, 9],
];

const BUTTON: Pixel[] = [
  [6, 7], [7, 7], [8, 7], [9, 7],
  [6, 8], [7, 8], [8, 8], [9, 8],
];

const TOP_FILL: Pixel[] = [
  [6, 2], [7, 2], [8, 2], [9, 2],
  [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
  [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],
  [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],
  [2, 6], [3, 6], [4, 6], [5, 6], [10, 6], [11, 6], [12, 6], [13, 6],
];

const BOTTOM_FILL: Pixel[] = [
  [2, 9], [3, 9], [4, 9], [5, 9], [10, 9], [11, 9], [12, 9], [13, 9],
  [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [12, 10],
  [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11],
  [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12], [11, 12],
  [6, 13], [7, 13], [8, 13], [9, 13],
];

const PALETTES = {
  uncaught: {
    outline: "#6b7280",
    top: "#9aa0a6",
    bottom: "#d8dbe0",
    band: "#6b7280",
    button: "#eef0f2",
    buttonRing: "#6b7280",
  },
  poke: {
    outline: "#1a1a1a",
    top: "#ee1515",
    bottom: "#ffffff",
    band: "#1a1a1a",
    button: "#ffffff",
    buttonRing: "#1a1a1a",
  },
  ultra: {
    outline: "#1a1a1a",
    top: "#2b2b2b",
    bottom: "#ffffff",
    band: "#e6c31a",
    button: "#ffffff",
    buttonRing: "#1a1a1a",
  },
} as const;

const ULTRA_MARK: Pixel[] = [
  [4, 3], [5, 3], [6, 3], [9, 3], [10, 3], [11, 3],
  [4, 4], [7, 4], [8, 4], [11, 4],
  [4, 5], [5, 5], [6, 5], [9, 5], [10, 5], [11, 5],
];

function pixels(list: Pixel[], fill: string, key: string) {
  return list.map(([x, y]) => <rect key={`${key}-${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
}

/** Pixel-art Poké Ball — gray when uncaught, classic colors when caught. Ultra Ball marks an uploaded specimen. */
export function PokeBallIcon({ caught, size = 20, kind = "poke", label }: PokeBallIconProps) {
  const colors = kind === "ultra" ? PALETTES.ultra : PALETTES[caught ? "poke" : "uncaught"];

  return (
    <svg
      className="pk-pokeball"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    >
      {pixels(TOP_FILL, colors.top, "t")}
      {kind === "ultra" ? pixels(ULTRA_MARK, colors.band, "mark") : null}
      {pixels(BOTTOM_FILL, colors.bottom, "b")}
      {pixels(BAND, colors.band, "band")}
      {pixels(BUTTON_RING, colors.buttonRing, "ring")}
      {pixels(BUTTON, colors.button, "btn")}
      {pixels(OUTLINE, colors.outline, "o")}
    </svg>
  );
}
