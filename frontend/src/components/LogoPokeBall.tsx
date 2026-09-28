import { useId, type SVGProps } from "react";

type LogoPokeBallProps = {
  muted?: boolean;
} & SVGProps<SVGSVGElement>;

const BOX = 32;
const STROKE = 2.4;
const RADIUS = 5;
const PAD = STROKE / 2;
const INNER = BOX - STROKE;
const MID = BOX / 2;
const BAND = 2.8;

function clipRef(reactId: string, slot: string) {
  return `pk-ball-${slot}-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function LogoPokeBall({ muted = false, className, ...svgProps }: LogoPokeBallProps) {
  const reactId = useId();
  const lidClip = clipRef(reactId, "lid");
  const baseClip = clipRef(reactId, "base");
  const classes = ["pk-logo-ball", muted ? "is-muted" : "", className].filter(Boolean).join(" ");
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      width="1em"
      height="1em"
      overflow="visible"
      {...svgProps}
      className={classes}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={lidClip}>
          <rect x="0" y="0" width={BOX} height={MID} />
        </clipPath>
        <clipPath id={baseClip}>
          <rect x="0" y={MID} width={BOX} height={MID} />
        </clipPath>
      </defs>
      <ellipse className="pk-logo-ball-flash" cx={MID} cy={MID} rx={7} ry={5} fill="var(--pk-ball-flash)" />
      <g className="pk-logo-ball-base" clipPath={`url(#${baseClip})`}>
        <rect x={PAD} y={PAD} width={INNER} height={INNER} rx={RADIUS} fill="var(--pk-ball-bottom)" />
        <rect x={PAD} y={MID} width={INNER} height={BAND / 2} fill="var(--pk-ball-ink)" />
        <rect
          x={PAD}
          y={PAD}
          width={INNER}
          height={INNER}
          rx={RADIUS}
          fill="none"
          stroke="var(--pk-ball-ink)"
          strokeWidth={STROKE}
        />
      </g>
      <g className="pk-logo-ball-lid">
        <g clipPath={`url(#${lidClip})`}>
          <rect x={PAD} y={PAD} width={INNER} height={INNER} rx={RADIUS} fill="var(--pk-ball-top)" />
          <rect x={PAD} y={MID - BAND / 2} width={INNER} height={BAND / 2} fill="var(--pk-ball-ink)" />
          <rect
            x={PAD}
            y={PAD}
            width={INNER}
            height={INNER}
            rx={RADIUS}
            fill="none"
            stroke="var(--pk-ball-ink)"
            strokeWidth={STROKE}
          />
        </g>
        <circle cx={MID} cy={MID} r={5.1} fill="var(--pk-ball-ink)" />
        <circle cx={MID} cy={MID} r={3.35} fill="var(--pk-ball-bottom)" />
        <circle cx={MID} cy={MID} r={3.35} fill="none" stroke="var(--pk-ball-ink)" strokeWidth={1.15} />
      </g>
    </svg>
  );
}
