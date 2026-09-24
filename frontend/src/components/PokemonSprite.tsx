import type { ImgHTMLAttributes } from "react";
import { spriteUrl } from "../format";

type PokemonSpriteProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  pokemonId: number;
  shiny?: boolean;
  female?: boolean;
};

/** Static sprite PNG (normal or shiny). Grayscale → color is handled by CSS on card hover. */
export function PokemonSprite({
  pokemonId,
  shiny = false,
  female = false,
  className,
  alt,
  loading,
  ...rest
}: PokemonSpriteProps) {
  const frameClass = ["pk-sprite-frame", className].filter(Boolean).join(" ");

  return (
    <span className={frameClass}>
      <img
        {...rest}
        alt={alt ?? ""}
        loading={loading}
        className="pk-sprite-frame-img"
        src={spriteUrl(pokemonId, shiny, female)}
        width={96}
        height={96}
        draggable={false}
      />
    </span>
  );
}
