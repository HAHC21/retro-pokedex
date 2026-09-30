import { useEffect, useState } from "react";
import { homeSpriteUrl, officialArtworkUrl } from "../../scanner/sprites";
import { spriteUrl } from "../../format";

type HomeSpriteProps = {
  pokemonId: number;
  formName?: string | null;
  shiny?: boolean;
  alt?: string;
  className?: string;
};

/** 3D HOME render, then official artwork, then the pixel sprite. Regional forms use the form sprite. */
export function HomeSprite({ pokemonId, formName = null, shiny = false, alt = "", className }: HomeSpriteProps) {
  const sources = formName
    ? [spriteUrl(pokemonId, shiny, false, formName), spriteUrl(pokemonId, shiny)]
    : shiny
      ? [homeSpriteUrl(pokemonId, true), homeSpriteUrl(pokemonId), spriteUrl(pokemonId, true)]
      : [homeSpriteUrl(pokemonId), officialArtworkUrl(pokemonId), spriteUrl(pokemonId)];
  const [index, setIndex] = useState(0);
  const src = sources[Math.min(index, sources.length - 1)];

  useEffect(() => {
    setIndex(0);
  }, [pokemonId, formName, shiny]);

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      onError={() => {
        setIndex((current) => (current + 1 < sources.length ? current + 1 : current));
      }}
    />
  );
}
