import type { CSSProperties } from "react";
import { TYPE_COLORS, type PokemonType } from "../catalog";
import { title } from "../format";
import { localizedType } from "../i18n/labels";

type TypeTagProps = {
  type: string;
};

export function typeTagStyle(type: string): CSSProperties {
  const colors = TYPE_COLORS[type as PokemonType] || ["var(--color-neutral-200)", "var(--color-neutral-800)"];
  return {
    fontSize: 10,
    letterSpacing: "0.1em",
    "--tag-fill": colors[0],
    "--tag-ink": colors[1],
  } as CSSProperties;
}

export function typeLabel(type: string) {
  return localizedType(type) || title(type);
}

export function TypeTag({ type }: TypeTagProps) {
  return (
    <span className="tag pk-type-tag" style={typeTagStyle(type)}>
      {typeLabel(type)}
    </span>
  );
}
