import { useI18n } from "../i18n/context";

type WordmarkProps = {
  onClick: () => void;
};

const BOX = 32;
const STROKE = 2.4;
const RADIUS = 5;
const PAD = STROKE / 2;
const INNER = BOX - STROKE;
const MID = BOX / 2;
const BAND = 2.8;

function LogoPokeBall() {
  return (
    <svg
      className="pk-logo-ball"
      viewBox={`0 0 ${BOX} ${BOX}`}
      width="1em"
      height="1em"
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="pk-logo-ball-lid-clip">
          <rect x="0" y="0" width={BOX} height={MID} />
        </clipPath>
        <clipPath id="pk-logo-ball-base-clip">
          <rect x="0" y={MID} width={BOX} height={MID} />
        </clipPath>
      </defs>
      <ellipse className="pk-logo-ball-flash" cx={MID} cy={MID} rx={7} ry={5} fill="#ffd84a" />
      <g className="pk-logo-ball-base" clipPath="url(#pk-logo-ball-base-clip)">
        <rect x={PAD} y={PAD} width={INNER} height={INNER} rx={RADIUS} fill="#fff" />
        <rect x={PAD} y={MID} width={INNER} height={BAND / 2} fill="var(--color-logo-ink)" />
        <rect
          x={PAD}
          y={PAD}
          width={INNER}
          height={INNER}
          rx={RADIUS}
          fill="none"
          stroke="var(--color-logo-ink)"
          strokeWidth={STROKE}
        />
      </g>
      <g className="pk-logo-ball-lid">
        <g clipPath="url(#pk-logo-ball-lid-clip)">
          <rect x={PAD} y={PAD} width={INNER} height={INNER} rx={RADIUS} fill="var(--color-logo-red)" />
          <rect x={PAD} y={MID - BAND / 2} width={INNER} height={BAND / 2} fill="var(--color-logo-ink)" />
          <rect
            x={PAD}
            y={PAD}
            width={INNER}
            height={INNER}
            rx={RADIUS}
            fill="none"
            stroke="var(--color-logo-ink)"
            strokeWidth={STROKE}
          />
        </g>
        <circle cx={MID} cy={MID} r={5.1} fill="var(--color-logo-ink)" />
        <circle cx={MID} cy={MID} r={3.35} fill="#fff" />
        <circle cx={MID} cy={MID} r={3.35} fill="none" stroke="var(--color-logo-ink)" strokeWidth={1.15} />
      </g>
    </svg>
  );
}

export function Wordmark({ onClick }: WordmarkProps) {
  const { messages: m } = useI18n();
  return (
    <button type="button" className="pk-logo" aria-label={m.auth.home} onClick={onClick}>
      <span className="pk-wordmark" aria-hidden="true">
        <span className="pk-word pk-word-retro">Retro</span>
        <span className="pk-word pk-word-pokedex">
          <span>P</span>
          <LogoPokeBall />
          <span>kedex</span>
        </span>
      </span>
    </button>
  );
}
