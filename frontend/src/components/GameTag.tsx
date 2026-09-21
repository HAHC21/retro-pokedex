import { versionLabel, versionTagStyle, versionsForGame } from "../catalog";
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

export function GameKeyTag({ gameKey }: { gameKey: string }) {
  const versions = versionsForGame(gameKey);
  return <GameTag versionKey={versions?.[0] || gameKey} label={gameLabel(gameKey)} />;
}
