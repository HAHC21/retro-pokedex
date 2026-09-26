import { versionLabel, versionTagStyle, versionsForGame } from "../catalog";
import { fill, getMessages } from "../i18n/runtime";
import { gameLabel } from "../progress";

type GameTagProps = {
  versionKey: string;
  label?: string;
};

export function GameTag({ versionKey, label }: GameTagProps) {
  const style = versionTagStyle(versionKey);
  return (
    <span className={`tag pk-game-tag${style ? "" : " tag-outline"}`} style={style}>
      {label || versionLabel(versionKey) || versionKey}
    </span>
  );
}

export function GameKeyTag({
  gameKey,
  onClick,
  pressed,
}: {
  gameKey: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const versions = versionsForGame(gameKey);
  const versionKey = versions?.[0] || gameKey;
  const label = gameLabel(gameKey);
  if (!onClick) {
    return <GameTag versionKey={versionKey} label={label} />;
  }
  const style = versionTagStyle(versionKey);
  return (
    <button
      type="button"
      className={`tag pk-game-tag${pressed ? " is-selected" : ""}${style ? "" : " tag-outline"}`}
      style={style}
      aria-label={pressed === undefined ? fill(getMessages().game.changeFrom, { game: label }) : label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
