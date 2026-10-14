import { TYPE_COLORS, type PokemonType } from "../catalog";
import { MoveCategoryIcon } from "./MoveCategoryIcon";
import { TypeIcon } from "./TypeIcon";
import { typeTagStyle } from "./TypeTag";

type MoveNameTagProps = {
  name: string;
  type: string | null;
  damageClass: string | null;
};

export function MoveNameTag({ name, type, damageClass }: MoveNameTagProps) {
  const typeStyle = type ? typeTagStyle(type) : undefined;
  const borderColor =
    type && TYPE_COLORS[type as PokemonType] ? TYPE_COLORS[type as PokemonType][1] : "var(--color-neutral-800)";
  return (
    <span className={`tag pk-move-name${type ? " pk-type-tag" : ""}`} style={typeStyle} title={type || undefined}>
      <span className="pk-move-type-code" style={{ background: borderColor }}>
        {type ? <TypeIcon type={type} /> : null}
      </span>
      <span className="pk-move-name-text">{name}</span>
      <MoveCategoryIcon damageClass={damageClass} />
    </span>
  );
}
