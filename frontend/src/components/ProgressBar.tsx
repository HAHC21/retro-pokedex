type ProgressBarProps = {
  pct: number;
  shinyPct?: number;
  tall?: boolean;
};

export function ProgressBar({ pct, shinyPct, tall }: ProgressBarProps) {
  return (
    <span className={tall ? "pk-bar pk-bar-tall" : "pk-bar"}>
      <span className="pk-bar-fill" style={{ width: `${pct}%` }} />
      {shinyPct != null ? <span className="pk-bar-hatch" style={{ width: `${shinyPct}%` }} /> : null}
    </span>
  );
}
